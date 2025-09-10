package handlers

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/cache"
	"github.com/mouizahmed/justscribe-backend/internal/jobs"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type URLExtractionHandler struct {
	cacheClient *cache.Client
	jobClient   *jobs.Client
	fileRepo    *repository.FileRepository
}

type URLExtractionRequest struct {
	URL      string `json:"url" binding:"required"`
	FolderID string `json:"folder_id,omitempty"`
}

type URLExtractionResponse struct {
	FileID   string `json:"file_id"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
}

func NewURLExtractionHandler(cacheClient *cache.Client, jobClient *jobs.Client, fileRepo *repository.FileRepository) *URLExtractionHandler {
	return &URLExtractionHandler{
		cacheClient: cacheClient,
		jobClient:   jobClient,
		fileRepo:    fileRepo,
	}
}

func (h *URLExtractionHandler) SubmitURL(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req URLExtractionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !isValidURL(req.URL) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL format"})
		return
	}

	file := &models.UploadFile{
		ID:        uuid.New(),
		UserID:    userID,
		SourceURL: &req.URL,
		Name:      "",
		SizeBytes: 0,
		Status:    "pending",
	}

	err = h.fileRepo.CreateFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file record"})
		return
	}

	ctx := context.Background()
	err = h.cacheClient.SetURLProgress(ctx, file.ID.String(), 0)
	if err != nil {
		log.Printf("Error setting initial progress: %v", err)
	}

	err = h.jobClient.EnqueueURLExtract(req.URL, file.ID.String(), userID)
	if err != nil {
		file.Status = "failed"
		file.UpdatedAt = time.Now().UTC()
		updateErr := h.fileRepo.UpdateFile(file)
		if updateErr != nil {
			log.Printf("Error updating file status to failed: %v", updateErr)
		}

		log.Printf("Error enqueuing URL extraction job: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue extraction job"})
		return
	}

	response := URLExtractionResponse{
		FileID:   file.ID.String(),
		Status:   file.Status,
		Progress: 0,
	}

	c.JSON(http.StatusCreated, response)
}

// GetJobStatus returns the current status of a URL extraction job
func (h *URLExtractionHandler) GetJobStatus(c *gin.Context) {
	fileID := c.Param("jobId") // Using jobId param but it's actually fileID
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File ID is required"})
		return
	}

	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Parse fileID to UUID
	fileUUID, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID format"})
		return
	}

	// Get file from database
	file, err := h.fileRepo.GetFileByID(fileUUID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "file not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file information"})
		return
	}

	// Check if user owns this file
	if file.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Get progress from cache
	ctx := context.Background()
	progress, err := h.cacheClient.GetURLProgress(ctx, fileID)
	if err != nil {
		log.Printf("Error getting progress: %v", err)
		progress = 0
	}

	// Return file status with progress
	response := map[string]interface{}{
		"file_id":    file.ID.String(),
		"url":        file.SourceURL,
		"status":     file.Status,
		"progress":   progress,
		"created_at": file.CreatedAt,
		"updated_at": file.UpdatedAt,
	}

	if file.Name != "" {
		response["name"] = file.Name
	}
	if file.StorageURL != nil {
		response["storage_url"] = *file.StorageURL
	}
	if file.SizeBytes != 0 {
		response["size_bytes"] = file.SizeBytes
	}

	c.JSON(http.StatusOK, response)
}

// CancelJob cancels a URL extraction job
func (h *URLExtractionHandler) CancelJob(c *gin.Context) {
	fileID := c.Param("jobId")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File ID is required"})
		return
	}

	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Parse fileID to UUID
	fileUUID, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID format"})
		return
	}

	// Get file from database
	file, err := h.fileRepo.GetFileByID(fileUUID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "file not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file information"})
		return
	}

	// Check if user owns this file
	if file.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Check if job can be cancelled
	if file.Status == "completed" || file.Status == "failed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "Cannot cancel job",
			"reason": "Job is already " + file.Status,
		})
		return
	}

	// Update file status to cancelled
	file.Status = "cancelled"
	file.UpdatedAt = time.Now().UTC()

	err = h.fileRepo.UpdateFile(file)
	if err != nil {
		log.Printf("Error updating file status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Job cancelled successfully",
		"file_id": fileID,
		"status":  "cancelled",
	})
}

// GetUserJobs returns all URL extraction jobs for the current user
func (h *URLExtractionHandler) GetUserJobs(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Get all files with source URLs for this user (all statuses)
	files, err := h.fileRepo.GetFilesByUserID(userID, []string{})
	if err != nil {
		log.Printf("Error getting user files: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve extraction jobs"})
		return
	}

	// Filter files that have source URLs (URL extraction jobs)
	var urlJobs []map[string]interface{}
	ctx := context.Background()

	for _, file := range files {
		if file.SourceURL != nil {
			progress, _ := h.cacheClient.GetURLProgress(ctx, file.ID.String())

			job := map[string]interface{}{
				"file_id":    file.ID.String(),
				"url":        *file.SourceURL,
				"status":     file.Status,
				"progress":   progress,
				"created_at": file.CreatedAt,
				"updated_at": file.UpdatedAt,
			}

			if file.Name != "" {
				job["name"] = file.Name
			}
			if file.SizeBytes != 0 {
				job["size_bytes"] = file.SizeBytes
			}
			if file.StorageURL != nil {
				job["storage_url"] = *file.StorageURL
			}

			urlJobs = append(urlJobs, job)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"jobs":  urlJobs,
		"count": len(urlJobs),
	})
}

func isValidURL(urlStr string) bool {
	if len(urlStr) == 0 {
		return false
	}

	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return false
	}

	if parsedURL.Scheme == "" || parsedURL.Host == "" {
		return false
	}

	if parsedURL.Scheme != "https" {
		return false
	}

	return true
}
