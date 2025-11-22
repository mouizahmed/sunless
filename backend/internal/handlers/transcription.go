package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/jobs"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type TranscriptionHandler struct {
	transcriptionRepo *repository.TranscriptionRepository
	fileRepo          *repository.FileRepository
	jobClient         *jobs.Client
}

func NewTranscriptionHandler(
	transcriptionRepo *repository.TranscriptionRepository,
	fileRepo *repository.FileRepository,
	jobClient *jobs.Client,
) *TranscriptionHandler {
	return &TranscriptionHandler{
		transcriptionRepo: transcriptionRepo,
		fileRepo:          fileRepo,
		jobClient:         jobClient,
	}
}

func (h *TranscriptionHandler) BatchCreateTranscriptions(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.BatchCreateTranscriptionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.FileIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one file is required"})
		return
	}

	// Validate all files exist and belong to user
	for _, fileID := range req.FileIDs {
		_, err := h.fileRepo.GetFileByID(fileID, userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "File not found or access denied",
				"file_id": fileID,
			})
			return
		}
	}

	// Marshal settings to JSON once (shared settings)
	settingsBytes, err := json.Marshal(req.Settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process settings"})
		return
	}

	// Create transcription records
	var transcriptions []*models.Transcription
	var responses []models.TranscriptionResponse

	for _, fileID := range req.FileIDs {
		transcriptionID := uuid.New()

		transcription := &models.Transcription{
			ID:           transcriptionID,
			UserID:       userID,
			FileID:       fileID,
			GlossaryID:   req.GlossaryID,
			LanguageCode: req.LanguageCode,
			Status:       "queued",
			Model:        req.Model,
			Settings:     settingsBytes,
		}

		transcriptions = append(transcriptions, transcription)
	}

	// Save all transcriptions in a single transaction
	err = h.transcriptionRepo.BatchCreate(transcriptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transcriptions"})
		return
	}

	// Create job payload once with shared settings
	var glossaryIDStr *string
	if req.GlossaryID != nil {
		glossaryIDStr = new(string)
		*glossaryIDStr = req.GlossaryID.String()
	}

	// Queue all transcription jobs
	for _, transcription := range transcriptions {
		payload := jobs.TranscriptionPayload{
			TranscriptionID: transcription.ID.String(),
			FileID:          transcription.FileID.String(),
			UserID:          userID,
			GlossaryID:      glossaryIDStr,
			LanguageCode:    req.LanguageCode,
			Model:           req.Model,
			Settings: jobs.TranscriptionJobSettings{
				SpeakerDetection: req.Settings.SpeakerDetection,
				FillerDetection:  req.Settings.FillerDetection,
			},
		}

		// Enqueue the job
		err = h.jobClient.EnqueueTranscription(payload)
		if err != nil {
			// Update transcription status to failed
			errorMsg := err.Error()
			h.transcriptionRepo.UpdateStatus(transcription.ID, "failed", nil, &errorMsg)

			c.JSON(http.StatusInternalServerError, gin.H{
				"error":            "Failed to queue transcription job",
				"transcription_id": transcription.ID,
			})
			return
		}

		// Create response
		responses = append(responses, models.TranscriptionResponse{
			ID:     transcription.ID,
			FileID: transcription.FileID,
			Status: transcription.Status,
			JobID:  transcription.JobID,
		})
	}

	response := models.BatchCreateTranscriptionsResponse{
		Success:        true,
		Transcriptions: responses,
	}

	c.JSON(http.StatusCreated, response)
}

func (h *TranscriptionHandler) GetTranscriptions(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	transcriptions, err := h.transcriptionRepo.GetByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get transcriptions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"transcriptions": transcriptions})
}

func (h *TranscriptionHandler) GetTranscription(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transcription ID"})
		return
	}

	transcription, err := h.transcriptionRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transcription not found"})
		return
	}

	if transcription.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, transcription)
}

func (h *TranscriptionHandler) DeleteTranscription(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transcription ID"})
		return
	}

	transcription, err := h.transcriptionRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transcription not found"})
		return
	}

	if transcription.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	err = h.transcriptionRepo.Delete(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete transcription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transcription deleted successfully"})
}
