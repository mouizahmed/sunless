package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type TranscriptHandler struct {
	transcriptRepo *repository.TranscriptRepository
	noteRepo       *repository.NoteRepository
}

func NewTranscriptHandler(transcriptRepo *repository.TranscriptRepository, noteRepo *repository.NoteRepository) *TranscriptHandler {
	return &TranscriptHandler{
		transcriptRepo: transcriptRepo,
		noteRepo:       noteRepo,
	}
}

type SaveSegmentsRequest struct {
	Speakers []SaveSpeakerPayload `json:"speakers"`
	Segments []SaveSegmentPayload `json:"segments"`
}

type SaveSpeakerPayload struct {
	SpeakerKey int    `json:"speaker_key"`
	Channel    int    `json:"channel"`
	Label      string `json:"label"`
	Color      string `json:"color"`
}

type SaveSegmentPayload struct {
	SpeakerKey   int      `json:"speaker_key"`
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

	// Upsert all speakers and build lookup map
	type speakerLookupKey struct {
		SpeakerKey int
		Channel    int
	}
	speakerMap := make(map[speakerLookupKey]string)

	for _, sp := range req.Speakers {
		speaker := &models.TranscriptSpeaker{
			NoteID:     noteID,
			UserID:     userID,
			SpeakerKey: sp.SpeakerKey,
			Channel:    sp.Channel,
			Label:      sp.Label,
			Color:      sp.Color,
		}
		upserted, err := h.transcriptRepo.UpsertSpeaker(speaker)
		if err != nil {
			log.Printf("transcript: failed to upsert speaker for note %s: %v", noteID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save speakers"})
			return
		}
		speakerMap[speakerLookupKey{SpeakerKey: sp.SpeakerKey, Channel: sp.Channel}] = upserted.ID
	}

	// Build segments with resolved speaker IDs
	segments := make([]*models.TranscriptSegment, 0, len(req.Segments))
	for _, seg := range req.Segments {
		key := speakerLookupKey{SpeakerKey: seg.SpeakerKey, Channel: seg.Channel}
		speakerID, ok := speakerMap[key]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "segment references unknown speaker"})
			return
		}

		segments = append(segments, &models.TranscriptSegment{
			NoteID:       noteID,
			SpeakerID:    speakerID,
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

	speakers, err := h.transcriptRepo.GetSpeakersByNote(noteID, userID)
	if err != nil {
		log.Printf("transcript: failed to get speakers for note %s: %v", noteID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load transcript"})
		return
	}

	segments, err := h.transcriptRepo.GetSegmentsByNote(noteID, userID)
	if err != nil {
		log.Printf("transcript: failed to get segments for note %s: %v", noteID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load transcript"})
		return
	}

	if speakers == nil {
		speakers = []*models.TranscriptSpeaker{}
	}
	if segments == nil {
		segments = []*models.TranscriptSegment{}
	}

	c.JSON(http.StatusOK, gin.H{
		"speakers": speakers,
		"segments": segments,
	})
}

func (h *TranscriptHandler) UpdateSpeaker(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	speakerID := strings.TrimSpace(c.Param("speakerID"))
	if speakerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "speaker id is required"})
		return
	}

	var req struct {
		Label string `json:"label"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	label := strings.TrimSpace(req.Label)
	color := strings.TrimSpace(req.Color)
	if label == "" && color == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "label or color is required"})
		return
	}

	if err := h.transcriptRepo.UpdateSpeaker(speakerID, userID, label, color); err != nil {
		if err.Error() == "speaker not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "speaker not found"})
			return
		}
		log.Printf("transcript: failed to update speaker %s: %v", speakerID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update speaker"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
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
