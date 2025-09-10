package handlers

import (
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/storage"
	ffmpeg "github.com/u2takey/ffmpeg-go"
)

type UploadHandler struct {
	fileRepo *repository.FileRepository
	b2Client *storage.B2Client
}

func NewUploadHandler(fileRepo *repository.FileRepository, b2Client *storage.B2Client) *UploadHandler {
	return &UploadHandler{
		fileRepo: fileRepo,
		b2Client: b2Client,
	}
}

const (
	ChunkSize   = 100 * 1024 * 1024      // 100MB chunks
	MaxFileSize = 2 * 1024 * 1024 * 1024 // 2GB max
)

// hasAudioContent analyzes the uploaded file to determine if it contains audio
func (h *UploadHandler) hasAudioContent(fileURL, contentType, fileName string) (bool, error) {
	// First check by file extension and content type (fast fallback)
	if h.isAudioByExtension(fileName) || h.isAudioByContentType(contentType) {
		log.Printf("File %s detected as audio by extension/content-type", fileName)
		return true, nil
	}

	// For video files, try ffmpeg probe (but handle failures gracefully)
	if h.isVideoByExtension(fileName) || h.isVideoByContentType(contentType) {
		// Try to probe for audio streams in video file
		probeData, err := ffmpeg.Probe(fileURL, ffmpeg.KwArgs{
			"timeout": "30", // 30 second timeout
		})
		if err != nil {
			log.Printf("FFmpeg probe failed for %s: %v", fileURL, err)
			// For video files, assume they have audio if probe fails
			// This is safer than rejecting potentially valid files
			log.Printf("Assuming video file %s has audio since probe failed", fileName)
			return true, nil
		}

		// Parse probe data to check for audio streams
		type ProbeData struct {
			Streams []struct {
				CodecType string `json:"codec_type"`
				CodecName string `json:"codec_name"`
				Duration  string `json:"duration"`
			} `json:"streams"`
		}

		var probe ProbeData
		if err := json.Unmarshal([]byte(probeData), &probe); err != nil {
			log.Printf("Error parsing probe data for %s: %v", fileURL, err)
			// Assume has audio if we can't parse
			return true, nil
		}

		// Check if any stream is audio
		for _, stream := range probe.Streams {
			if stream.CodecType == "audio" {
				log.Printf("Audio stream found in %s: codec=%s", fileURL, stream.CodecName)
				return true, nil
			}
		}

		log.Printf("No audio streams found in video file %s", fileName)
		return false, nil
	}

	// For other file types, assume no audio
	log.Printf("File %s is not an audio or video file", fileName)
	return false, nil
}

// isAudioByExtension checks if file has audio extension
func (h *UploadHandler) isAudioByExtension(fileName string) bool {
	audioExtensions := []string{".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma", ".opus"}
	fileName = strings.ToLower(fileName)
	for _, ext := range audioExtensions {
		if strings.HasSuffix(fileName, ext) {
			return true
		}
	}
	return false
}

// isVideoByExtension checks if file has video extension
func (h *UploadHandler) isVideoByExtension(fileName string) bool {
	videoExtensions := []string{".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv", ".m4v"}
	fileName = strings.ToLower(fileName)
	for _, ext := range videoExtensions {
		if strings.HasSuffix(fileName, ext) {
			return true
		}
	}
	return false
}

// isAudioByContentType checks if content type indicates audio
func (h *UploadHandler) isAudioByContentType(contentType string) bool {
	return strings.HasPrefix(strings.ToLower(contentType), "audio/")
}

// isVideoByContentType checks if content type indicates video
func (h *UploadHandler) isVideoByContentType(contentType string) bool {
	return strings.HasPrefix(strings.ToLower(contentType), "video/")
}

func (h *UploadHandler) InitiateUpload(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.InitiateUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.FileSize > MaxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 2GB limit"})
		return
	}

	if req.FileSize <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size must be greater than 0"})
		return
	}

	fileKey := fmt.Sprintf("uploads/%s/%s/%s", userID, uuid.New().String(), req.FileName)

	file := &models.UploadFile{
		Name:        req.FileName,
		UserID:      userID,
		StorageKey:  &fileKey,
		SizeBytes:   req.FileSize,
		ContentType: req.ContentType,
		Duration:    req.Duration,
		Status:      "uploading",
	}

	if err := h.fileRepo.CreateFile(file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file record"})
		return
	}

	var totalChunks int
	var chunkURLs []models.ChunkURL

	totalChunks = int((req.FileSize + ChunkSize - 1) / ChunkSize)

	// multipart upload for files > 100MB
	if req.FileSize > ChunkSize {
		startResp, err := h.b2Client.StartLargeFile(fileKey, req.ContentType)
		if err != nil {
			h.fileRepo.DeleteFile(file.ID, userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start file upload"})
			return
		}

		for i := 1; i <= totalChunks; i++ {
			partURL, err := h.b2Client.GetUploadPartURL(startResp.FileID)
			if err != nil {
				h.fileRepo.DeleteFile(file.ID, userID)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare file upload"})
				return
			}

			chunkURLs = append(chunkURLs, models.ChunkURL{
				ChunkNumber:        i,
				URL:                partURL.UploadURL,
				AuthorizationToken: partURL.AuthorizationToken,
			})
		}

		// Store the B2 file ID
		file.UploadID = &startResp.FileID
	} else {
		// single file upload
		totalChunks = 1

		uploadResp, err := h.b2Client.GetUploadURL()
		if err != nil {
			h.fileRepo.DeleteFile(file.ID, userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare file upload"})
			return
		}

		chunkURLs = []models.ChunkURL{
			{
				ChunkNumber:        1,
				URL:                uploadResp.UploadURL,
				AuthorizationToken: uploadResp.AuthorizationToken,
			},
		}

		file.UploadID = nil
	}

	if err := h.fileRepo.UpdateFile(file); err != nil {
		h.fileRepo.DeleteFile(file.ID, userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize upload session"})
		return
	}

	// Return session with direct B2 upload URLs
	response := models.InitiateUploadResponse{
		FileID:      file.ID,
		ChunkURLs:   chunkURLs,
		TotalChunks: totalChunks,
		ChunkSize:   ChunkSize,
		StorageKey:  fileKey,
	}

	c.JSON(http.StatusOK, response)
}

func (h *UploadHandler) CancelUpload(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File ID is required"})
		return
	}

	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Parse file ID
	fileUUID, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID format"})
		return
	}

	// Get file record to check if it's multipart
	file, err := h.fileRepo.GetFileByID(fileUUID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "file not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	// Cancel B2 multipart upload if it exists
	if file.UploadID != nil && *file.UploadID != "" {
		if _, err := h.b2Client.CancelLargeFile(*file.UploadID); err != nil {
			fmt.Printf("Warning: Failed to cancel B2 large file %s: %v\n", *file.UploadID, err)
			// Continue with local cancel even if B2 cancel fails
		} else {
			fmt.Printf("Successfully cancelled B2 large file: %s\n", *file.UploadID)
		}
	}

	// Update file status to cancelled
	if err := h.fileRepo.UpdateFileStatus(fileUUID, "cancelled"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel upload"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Upload cancelled successfully",
		"file_id": fileID,
	})
}

func (h *UploadHandler) DeleteUpload(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File ID is required"})
		return
	}

	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Parse file ID
	fileUUID, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID format"})
		return
	}

	// Get file record
	file, err := h.fileRepo.GetFileByID(fileUUID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "file not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file information"})
		return
	}

	// TODO: check if file has transcripts
	// Only allow deletion of uploaded files (not processed files with transcripts)
	if file.Status != "uploaded" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only delete uploaded files"})
		return
	}

	if file.StorageKey != nil && *file.StorageKey != "" {
		// Delete the file from B2
		if err := h.b2Client.DeleteFile(*file.StorageKey); err != nil {
			fmt.Printf("Warning: Failed to delete file from B2: %v\n", err)
			// Continue with soft delete even if B2 deletion fails
		}
	}

	// Soft delete: update status and clear B2 columns
	file.Status = "deleted"
	file.StorageKey = nil
	file.StorageURL = nil
	file.UploadID = nil
	file.FileHash = nil

	if err := h.fileRepo.UpdateFile(file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
		"file_id": fileID,
	})
}

func (h *UploadHandler) CompleteUpload(c *gin.Context) {
	userID := c.GetString("userID")
	fmt.Printf("CompleteUpload: userID = %s\n", userID)
	if userID == "" {
		fmt.Println("CompleteUpload: No userID found in context - token may be expired")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.CompleteUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get file record
	file, err := h.fileRepo.GetFileByID(req.FileID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "file not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Upload session not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve upload session"})
		return
	}

	if file.Status != "uploading" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is not in uploading state"})
		return
	}

	if file.StorageKey == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File storage key not found"})
		return
	}

	var fileURL string

	var fileHash string

	// Check if this was a multipart upload (files > 100MB)
	if file.SizeBytes > ChunkSize && file.UploadID != nil && *file.UploadID != "" {
		// Large file upload - finish with B2 Native API
		var partSha1Array []string
		for _, part := range req.Parts {
			partSha1Array = append(partSha1Array, part.ETag) // ETag contains SHA1 hash
		}

		_, err := h.b2Client.FinishLargeFile(*file.UploadID, partSha1Array)
		if err != nil {
			fmt.Println("Failed to finish B2 large file upload", err)
			h.fileRepo.UpdateFileStatus(file.ID, "failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finish B2 large file upload"})
			return
		}

		// For large files, create a combined hash from all parts
		if len(partSha1Array) > 0 {
			// Combine all part hashes into a single hash
			combinedHash := sha1.New()
			combinedHash.Write([]byte(strings.Join(partSha1Array, "")))
			fileHash = fmt.Sprintf("%x", combinedHash.Sum(nil))
		}

		// Generate file URL
		fileURL = h.b2Client.GetFileURL(*file.StorageKey)
	} else {
		// Single file upload (small files or large files that fit in one chunk)
		if len(req.Parts) > 0 {
			fileHash = req.Parts[0].ETag // ETag contains the SHA1 hash
		}

		fileURL = h.b2Client.GetFileURL(*file.StorageKey)
	}

	// Check if file has audio content before marking as completed
	hasAudio, err := h.hasAudioContent(fileURL, file.ContentType, file.Name)
	if err != nil {
		log.Printf("Audio analysis failed for file %s: %v", file.ID, err)
		// If analysis fails, treat as no audio to be safe
		hasAudio = false
	}

	if !hasAudio {
		log.Printf("No audio detected in file %s, marking as failed and cleaning up", file.ID)

		// Delete file from B2 storage
		if file.StorageKey != nil {
			if err := h.b2Client.DeleteFile(*file.StorageKey); err != nil {
				log.Printf("Warning: Failed to delete file from B2: %v", err)
			}
		}

		// Update file record as failed and clear B2 fields
		file.Status = "failed"
		file.StorageURL = nil
		file.StorageKey = nil
		file.UploadID = nil
		file.FileHash = nil

		if err := h.fileRepo.UpdateFile(file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file record"})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "No audio content detected in uploaded file",
			"message": "Please upload a file containing audio",
		})
		return
	}

	// Update file record as completed
	file.StorageURL = &fileURL
	file.Status = "uploaded"
	if fileHash != "" {
		file.FileHash = &fileHash
	}

	if err := h.fileRepo.UpdateFile(file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file record"})
		return
	}

	response := models.UploadCompleteResponse{
		FileID:  file.ID,
		FileURL: fileURL,
		Message: "Upload completed successfully",
	}

	c.JSON(http.StatusOK, response)
}

func (h *UploadHandler) GetFileStatus(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	fileIDStr := c.Param("fileId")
	fileID, err := uuid.Parse(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	file, err := h.fileRepo.GetFileByID(fileID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "file not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Upload session not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           file.ID,
		"name":         file.Name,
		"size_bytes":   file.SizeBytes,
		"content_type": file.ContentType,
		"status":       file.Status,
		"storage_url":  file.StorageURL,
		"created_at":   file.CreatedAt,
		"updated_at":   file.UpdatedAt,
	})
}
