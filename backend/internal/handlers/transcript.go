package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/queue"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type TranscriptHandler struct {
	transcriptRepo *repository.TranscriptRepository
	noteRepo       *repository.NoteRepository
	queue          *queue.Queue
}

func NewTranscriptHandler(transcriptRepo *repository.TranscriptRepository, noteRepo *repository.NoteRepository, q *queue.Queue) *TranscriptHandler {
	return &TranscriptHandler{
		transcriptRepo: transcriptRepo,
		noteRepo:       noteRepo,
		queue:          q,
	}
}

type SaveSegmentsRequest struct {
	Segments []SaveSegmentPayload `json:"segments"`
}

type SaveSegmentPayload struct {
	Channel      int      `json:"channel"`
	Text         string   `json:"text"`
	StartTime    *float64 `json:"start_time,omitempty"`
	EndTime      *float64 `json:"end_time,omitempty"`
	SegmentIndex int      `json:"segment_index"`
}

func (h *TranscriptHandler) SaveSegments(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	noteID := strings.TrimSpace(c.Param("noteID"))
	if noteID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "note id is required"})
		return
	}

	// Verify note belongs to user
	if _, err := h.noteRepo.GetNoteByID(userID, noteID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "note not found"})
		return
	}

	var req SaveSegmentsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	if len(req.Segments) == 0 {
		c.JSON(http.StatusOK, gin.H{"status": "success", "saved_count": 0})
		return
	}

	segments := make([]*models.TranscriptSegment, 0, len(req.Segments))
	for _, seg := range req.Segments {
		segments = append(segments, &models.TranscriptSegment{
			NoteID:       noteID,
			Channel:      seg.Channel,
			Text:         seg.Text,
			StartTime:    seg.StartTime,
			EndTime:      seg.EndTime,
			SegmentIndex: seg.SegmentIndex,
		})
	}

	if err := h.transcriptRepo.BatchInsertSegments(segments); err != nil {
		log.Printf("transcript: failed to batch insert segments for note %s: %v", noteID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save segments"})
		return
	}

	if h.queue != nil {
		go func() {
			_ = h.queue.Enqueue(context.Background(), queue.Job{
				Type: queue.JobIndexTranscript, UserID: userID, ID: noteID,
			})
		}()
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "saved_count": len(segments)})
}

func (h *TranscriptHandler) GetSegments(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	noteID := strings.TrimSpace(c.Param("noteID"))
	if noteID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "note id is required"})
		return
	}

	segments, err := h.transcriptRepo.GetSegmentsByNote(noteID, userID)
	if err != nil {
		log.Printf("transcript: failed to get segments for note %s: %v", noteID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load transcript"})
		return
	}

	if segments == nil {
		segments = []*models.TranscriptSegment{}
	}

	c.JSON(http.StatusOK, gin.H{
		"segments": segments,
	})
}

func (h *TranscriptHandler) SearchSegments(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusOK, gin.H{"segments": []*models.TranscriptSegment{}})
		return
	}

	limit := 20
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit parameter"})
			return
		}
		limit = parsed
	}

	segments, err := h.transcriptRepo.SearchSegments(userID, query, limit)
	if err != nil {
		log.Printf("transcript: failed to search segments for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to search transcripts"})
		return
	}

	if segments == nil {
		segments = []*models.TranscriptSegment{}
	}

	c.JSON(http.StatusOK, gin.H{"segments": segments})
}
