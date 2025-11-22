package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/prompts"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/storage"
	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/packages/param"
	responses "github.com/openai/openai-go/v3/responses"
	"github.com/openai/openai-go/v3/shared"
)

var ErrMissingOpenAIApiKey = errors.New("OPENAI_API_KEY is not configured")

type ChatHandler struct {
	conversationRepo *repository.ConversationRepository
	openaiClient     *openai.Client
	b2Client         *storage.B2Client
	apiConfigured    bool
}

type ChatRequest struct {
	SessionID       string                  `json:"session_id"`
	Channel         string                  `json:"channel"`
	Message         string                  `json:"message" binding:"required"`
	ClientMessageID string                  `json:"client_message_id"`
	Attachments     []ChatAttachmentPayload `json:"attachments"`
}

type ChatAttachmentPayload struct {
	ID        string `json:"id"`
	FileName  string `json:"file_name"`
	MimeType  string `json:"mime_type"`
	SizeBytes int64  `json:"size_bytes"`
	Source    string `json:"source"`
	Data      string `json:"data"`
}

type processedAttachment struct {
	ClientID   string
	Attachment *models.ConversationAttachment
	FileID     string
}

type conversationSessionResponse struct {
	ID                 string     `json:"id"`
	StartedAt          time.Time  `json:"started_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	ChatModelProvider  string     `json:"chat_model_provider"`
	ChatModelName      string     `json:"chat_model_name"`
	LiveModelProvider  *string    `json:"live_model_provider,omitempty"`
	LiveModelName      *string    `json:"live_model_name,omitempty"`
	MessageCount       int        `json:"message_count"`
	LastMessageSender  *string    `json:"last_message_sender,omitempty"`
	LastMessageAt      *time.Time `json:"last_message_at,omitempty"`
	LastMessagePreview *string    `json:"last_message_preview,omitempty"`
}

type conversationMessageAttachmentResponse struct {
	ID        string  `json:"id"`
	FileName  string  `json:"file_name"`
	MimeType  string  `json:"mime_type"`
	SizeBytes int64   `json:"size_bytes"`
	PublicURL *string `json:"public_url,omitempty"`
	Source    *string `json:"source,omitempty"`
}

type conversationMessageResponse struct {
	ID          string                                  `json:"id"`
	SessionID   string                                  `json:"session_id"`
	Channel     string                                  `json:"channel"`
	Sender      string                                  `json:"sender"`
	Content     string                                  `json:"content"`
	CreatedAt   time.Time                               `json:"created_at"`
	Attachments []conversationMessageAttachmentResponse `json:"attachments,omitempty"`
}

func (h *ChatHandler) ListSessions(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	limitParam := strings.TrimSpace(c.DefaultQuery("limit", "20"))
	if limitParam == "" {
		limitParam = "20"
	}

	limit, err := strconv.Atoi(limitParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit parameter"})
		return
	}
	if limit > 100 {
		limit = 100
	}
	if limit <= 0 {
		limit = 20
	}

	offsetParam := strings.TrimSpace(c.DefaultQuery("offset", "0"))
	if offsetParam == "" {
		offsetParam = "0"
	}

	offset, err := strconv.Atoi(offsetParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid offset parameter"})
		return
	}
	if offset < 0 {
		offset = 0
	}

	summaries, err := h.conversationRepo.ListSessionsByUser(userID, limit, offset)
	if err != nil {
		log.Printf("chat: failed to list sessions for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load history"})
		return
	}

	totalSessions, err := h.conversationRepo.CountSessionsByUser(userID)
	if err != nil {
		log.Printf("chat: failed to count sessions for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load history"})
		return
	}

	response := make([]conversationSessionResponse, 0, len(summaries))
	for _, summary := range summaries {
		response = append(response, conversationSessionSummaryToResponse(summary))
	}

	hasMore := offset+len(response) < totalSessions

	c.JSON(http.StatusOK, gin.H{
		"sessions": response,
		"pagination": gin.H{
			"total":    totalSessions,
			"limit":    limit,
			"offset":   offset,
			"has_more": hasMore,
		},
	})
}

func (h *ChatHandler) GetSessionHistory(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	sessionID := strings.TrimSpace(c.Param("sessionID"))
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session id is required"})
		return
	}

	session, err := h.conversationRepo.GetSessionByID(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	if session.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}

	messages, err := h.conversationRepo.ListMessagesBySession(session.ID)
	if err != nil {
		log.Printf("chat: failed to list messages for session %s: %v", session.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load messages"})
		return
	}

	messageIDs := make([]string, 0, len(messages))
	for _, msg := range messages {
		messageIDs = append(messageIDs, msg.ID)
	}

	attachmentsByMessage, err := h.conversationRepo.ListAttachmentsByMessageIDs(messageIDs)
	if err != nil {
		log.Printf("chat: failed to load attachments for session %s: %v", session.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load attachments"})
		return
	}

	messageResponses := make([]conversationMessageResponse, 0, len(messages))

	for _, msg := range messages {
		messageResp := conversationMessageResponse{
			ID:        msg.ID,
			SessionID: msg.SessionID,
			Channel:   msg.Channel,
			Sender:    msg.Sender,
			Content:   msg.Content,
			CreatedAt: msg.CreatedAt,
		}

		if attachments := attachmentsByMessage[msg.ID]; len(attachments) > 0 {
			attachmentResponses := make([]conversationMessageAttachmentResponse, 0, len(attachments))
			for _, att := range attachments {
				if att.DeletedAt != nil {
					continue
				}

				attachmentResponses = append(attachmentResponses, conversationMessageAttachmentResponse{
					ID:        att.ID,
					FileName:  att.FileName,
					MimeType:  att.MimeType,
					SizeBytes: att.SizeBytes,
					PublicURL: att.PublicURL,
					Source:    att.Source,
				})
			}

			if len(attachmentResponses) > 0 {
				messageResp.Attachments = attachmentResponses
			}
		}

		messageResponses = append(messageResponses, messageResp)
	}

	sessionResponse := conversationSessionToResponse(session, messages)

	c.JSON(http.StatusOK, gin.H{
		"session":  sessionResponse,
		"messages": messageResponses,
	})
}

func conversationSessionSummaryToResponse(summary repository.ConversationSessionSummary) conversationSessionResponse {
	resp := conversationSessionResponse{
		ID:                summary.Session.ID,
		StartedAt:         summary.Session.CreatedAt,
		UpdatedAt:         summary.Session.UpdatedAt,
		ChatModelProvider: summary.Session.ChatModelProvider,
		ChatModelName:     summary.Session.ChatModelName,
		LiveModelProvider: summary.Session.LiveModelProvider,
		LiveModelName:     summary.Session.LiveModelName,
		MessageCount:      summary.MessageCount,
	}

	if summary.LastMessageSender != nil {
		sender := *summary.LastMessageSender
		resp.LastMessageSender = &sender
	}

	if summary.LastMessageAt != nil {
		ts := *summary.LastMessageAt
		resp.LastMessageAt = &ts
	}

	if summary.LastMessageContent != nil {
		if preview := buildMessagePreview(*summary.LastMessageContent); preview != "" {
			resp.LastMessagePreview = &preview
		}
	}

	return resp
}

func conversationSessionToResponse(session *models.ConversationSession, messages []models.ConversationMessage) conversationSessionResponse {
	resp := conversationSessionResponse{
		ID:                session.ID,
		StartedAt:         session.CreatedAt,
		UpdatedAt:         session.UpdatedAt,
		ChatModelProvider: session.ChatModelProvider,
		ChatModelName:     session.ChatModelName,
		LiveModelProvider: session.LiveModelProvider,
		LiveModelName:     session.LiveModelName,
		MessageCount:      len(messages),
	}

	for i := len(messages) - 1; i >= 0; i-- {
		msg := messages[i]

		if resp.LastMessageAt == nil {
			ts := msg.CreatedAt
			resp.LastMessageAt = &ts
			sender := msg.Sender
			resp.LastMessageSender = &sender
		}

		if resp.LastMessagePreview == nil {
			if preview := buildMessagePreview(msg.Content); preview != "" {
				resp.LastMessagePreview = &preview
				if resp.LastMessageSender == nil {
					sender := msg.Sender
					resp.LastMessageSender = &sender
				}
				if resp.LastMessageAt == nil {
					ts := msg.CreatedAt
					resp.LastMessageAt = &ts
				}
			}
		}

		if resp.LastMessagePreview != nil && resp.LastMessageAt != nil {
			break
		}
	}

	return resp
}

func buildMessagePreview(content string) string {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return ""
	}

	const maxRunes = 200
	runes := []rune(trimmed)
	if len(runes) <= maxRunes {
		return trimmed
	}

	truncated := strings.TrimSpace(string(runes[:maxRunes]))
	if truncated == "" {
		return string(runes[:maxRunes]) + "…"
	}

	return truncated + "…"
}

func NewChatHandler(conversationRepo *repository.ConversationRepository, b2Client *storage.B2Client) (*ChatHandler, error) {
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" {
		return &ChatHandler{
			conversationRepo: conversationRepo,
			openaiClient:     nil,
			b2Client:         b2Client,
			apiConfigured:    false,
		}, ErrMissingOpenAIApiKey
	}

	client := openai.NewClient(option.WithAPIKey(apiKey))

	return &ChatHandler{
		conversationRepo: conversationRepo,
		openaiClient:     &client,
		b2Client:         b2Client,
		apiConfigured:    true,
	}, nil
}

func (h *ChatHandler) SendMessage(c *gin.Context) {
	if !h.apiConfigured {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "chat service not configured"})
		return
	}

	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	channel := req.Channel
	if channel == "" {
		channel = "chat"
	}
	if channel != "chat" && channel != "live" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel"})
		return
	}

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	var session *models.ConversationSession
	if req.SessionID != "" {
		session, err = h.conversationRepo.GetSessionByID(req.SessionID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}

		if session.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "session does not belong to user"})
			return
		}
	} else {
		session = &models.ConversationSession{
			UserID:            userID,
			ChatModelProvider: "openai",
			ChatModelName:     "gpt-5-nano",
		}

		session, err = h.conversationRepo.CreateSession(session)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
			return
		}
	}

	userMessage, err := h.conversationRepo.CreateMessage(&models.ConversationMessage{
		SessionID: session.ID,
		Channel:   channel,
		Sender:    "user",
		Content:   req.Message,
	})
	if err != nil {
		log.Printf("chat: failed to store user message for session %s: %v", session.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store user message", "details": err.Error()})
		return
	}

	processedAttachments, err := h.processAttachments(c.Request.Context(), session, userID, userMessage.ID, req.Attachments)
	if err != nil {
		log.Printf("chat: failed to process attachments for session %s: %v", session.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store attachments", "details": err.Error()})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)
	flusher.Flush()

	if req.ClientMessageID != "" {
		if err := writeSSEMessageAck(c.Writer, flusher, session.ID, req.ClientMessageID, userMessage, processedAttachments); err != nil {
			log.Printf("chat: failed to stream message ack for session %s: %v", session.ID, err)
		}
	}

	messages, err := h.conversationRepo.ListMessagesBySession(session.ID)
	if err != nil {
		log.Printf("chat: failed to retrieve conversation for session %s: %v", session.ID, err)
		writeSSEError(c.Writer, flusher, session.ID, "failed to retrieve conversation", err)
		return
	}

	messageIDs := make([]string, 0, len(messages))
	for _, msg := range messages {
		messageIDs = append(messageIDs, msg.ID)
	}

	attachmentsByMessage, err := h.conversationRepo.ListAttachmentsByMessageIDs(messageIDs)
	if err != nil {
		log.Printf("chat: failed to retrieve attachments for session %s: %v", session.ID, err)
		writeSSEError(c.Writer, flusher, session.ID, "failed to retrieve attachments", err)
		return
	}

	processedByAttachmentID := make(map[string]processedAttachment, len(processedAttachments))
	for _, pa := range processedAttachments {
		if pa.Attachment != nil {
			processedByAttachmentID[pa.Attachment.ID] = pa
		}
	}

	inputItems := make([]responses.ResponseInputItemUnionParam, 0, len(messages)+1)
	inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
		prompts.SunlessSystemPrompt,
		responses.EasyInputMessageRoleSystem,
	))
	// Append the canonical Sunless system prompt so every session begins with consistent instructions.

	for _, msg := range messages {
		role := responses.EasyInputMessageRoleUser
		if msg.Sender == "assistant" {
			role = responses.EasyInputMessageRoleAssistant
		}

		trimmed := strings.TrimSpace(msg.Content)
		attachmentRecords := attachmentsByMessage[msg.ID]

		contentParts := make([]responses.ResponseInputContentUnionParam, 0, 1+len(attachmentRecords))
		if trimmed != "" {
			contentParts = append(contentParts, responses.ResponseInputContentParamOfInputText(trimmed))
		}

		for _, att := range attachmentRecords {
			if att.DeletedAt != nil {
				continue
			}

			fileID := extractAttachmentFileID(att, processedByAttachmentID)

			if fileID != "" {
				if strings.HasPrefix(att.MimeType, "image/") {
					imageParam := responses.ResponseInputImageParam{
						Detail: responses.ResponseInputImageDetailAuto,
					}
					imageParam.FileID = param.NewOpt(fileID)
					contentParts = append(contentParts, responses.ResponseInputContentUnionParam{OfInputImage: &imageParam})
				} else {
					fileParam := responses.ResponseInputFileParam{}
					fileParam.FileID = param.NewOpt(fileID)
					contentParts = append(contentParts, responses.ResponseInputContentUnionParam{OfInputFile: &fileParam})
				}
			} else if att.PublicURL != nil && strings.HasPrefix(att.MimeType, "image/") {
				imageParam := responses.ResponseInputImageParam{
					Detail: responses.ResponseInputImageDetailAuto,
				}
				imageParam.ImageURL = param.NewOpt(*att.PublicURL)
				contentParts = append(contentParts, responses.ResponseInputContentUnionParam{OfInputImage: &imageParam})
			}

			description := att.FileName
			if description == "" {
				description = "Attachment"
			}
			if att.PublicURL != nil && fileID == "" {
				description = fmt.Sprintf("%s (%s)\n%s", description, att.MimeType, *att.PublicURL)
			} else {
				description = fmt.Sprintf("%s (%s)", description, att.MimeType)
			}
			contentParts = append(contentParts, responses.ResponseInputContentParamOfInputText(description))
		}

		if len(contentParts) == 0 {
			continue
		}

		var item responses.ResponseInputItemUnionParam
		if len(contentParts) == 1 && len(attachmentRecords) == 0 && trimmed != "" {
			item = responses.ResponseInputItemParamOfMessage(trimmed, role)
		} else {
			item = responses.ResponseInputItemParamOfMessage(responses.ResponseInputMessageContentListParam(contentParts), role)
		}

		inputItems = append(inputItems, item)
	}

	request := responses.ResponseNewParams{
		Model: shared.ResponsesModel(shared.ChatModelGPT5Nano),
		Input: responses.ResponseNewParamsInputUnion{
			OfInputItemList: responses.ResponseInputParam(inputItems),
		},
		Tools: []responses.ToolUnionParam{
			responses.ToolParamOfWebSearch(responses.WebSearchToolTypeWebSearch),
		},
	}

	stream := h.openaiClient.Responses.NewStreaming(c.Request.Context(), request)
	if err := stream.Err(); err != nil {
		log.Printf("chat: failed to start response stream for session %s: %v", session.ID, err)
		writeSSEError(c.Writer, flusher, session.ID, "failed to generate response", err)
		return
	}
	defer stream.Close()

	var assistantBuilder strings.Builder
	var completedResponse *responses.Response

	for stream.Next() {
		event := stream.Current()

		switch evt := event.AsAny().(type) {
		case responses.ResponseTextDeltaEvent:
			if evt.Delta == "" {
				continue
			}
			assistantBuilder.WriteString(evt.Delta)
			if err := writeSSEToken(c.Writer, flusher, session.ID, evt.Delta); err != nil {
				log.Printf("chat: failed to stream token for session %s: %v", session.ID, err)
				return
			}
		case responses.ResponseWebSearchCallSearchingEvent:
			if err := writeSSESearchStart(c.Writer, flusher, session.ID, "Searching the web…"); err != nil {
				log.Printf("chat: failed to stream search start event for session %s: %v", session.ID, err)
				return
			}
		case responses.ResponseWebSearchCallInProgressEvent:
			if err := writeSSESearchProgress(c.Writer, flusher, session.ID); err != nil {
				log.Printf("chat: failed to stream search progress event for session %s: %v", session.ID, err)
				return
			}
		case responses.ResponseWebSearchCallCompletedEvent:
			if err := writeSSESearchEnd(c.Writer, flusher, session.ID); err != nil {
				log.Printf("chat: failed to stream search end event for session %s: %v", session.ID, err)
				return
			}
		case responses.ResponseCompletedEvent:
			completedResponse = &evt.Response
		case responses.ResponseFailedEvent:
			msg := "response failed"
			if evt.Response.Error.Message != "" {
				msg = evt.Response.Error.Message
			}
			writeSSEError(c.Writer, flusher, session.ID, msg, fmt.Errorf("response failed"))
			return
		case responses.ResponseErrorEvent:
			msg := evt.Message
			if msg == "" {
				msg = "response error"
			}
			writeSSEError(c.Writer, flusher, session.ID, msg, errors.New(evt.Code))
			return
		default:
			// Ignore other event types for now.
		}
	}

	if err := stream.Err(); err != nil {
		log.Printf("chat: streaming error for session %s: %v", session.ID, err)
		writeSSEError(c.Writer, flusher, session.ID, "failed to generate response", err)
		return
	}

	assistantContent := assistantBuilder.String()
	if completedResponse != nil {
		if text := completedResponse.OutputText(); text != "" {
			assistantContent = text
		}
	}

	assistantMessage, err := h.conversationRepo.CreateMessage(&models.ConversationMessage{
		SessionID: session.ID,
		Channel:   channel,
		Sender:    "assistant",
		Content:   assistantContent,
	})
	if err != nil {
		log.Printf("chat: failed to store assistant message for session %s: %v", session.ID, err)
		writeSSEError(c.Writer, flusher, session.ID, "failed to store assistant message", err)
		return
	}

	if err := writeSSEDone(c.Writer, flusher, session.ID, assistantMessage); err != nil {
		log.Printf("chat: failed to stream completion event for session %s: %v", session.ID, err)
	}
}

func writeSSEPayload(w http.ResponseWriter, flusher http.Flusher, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	if _, err := fmt.Fprintf(w, "data: %s\n\n", data); err != nil {
		return err
	}

	flusher.Flush()
	return nil
}

func writeSSEToken(w http.ResponseWriter, flusher http.Flusher, sessionID, token string) error {
	if token == "" {
		return nil
	}

	payload := map[string]interface{}{
		"type":       "token",
		"session_id": sessionID,
		"content":    token,
	}

	return writeSSEPayload(w, flusher, payload)
}

func writeSSEDone(w http.ResponseWriter, flusher http.Flusher, sessionID string, message *models.ConversationMessage) error {
	payload := map[string]interface{}{
		"type":       "done",
		"session_id": sessionID,
	}

	if message != nil {
		payload["message"] = map[string]interface{}{
			"id":         message.ID,
			"session_id": message.SessionID,
			"channel":    message.Channel,
			"sender":     message.Sender,
			"content":    message.Content,
			"created_at": message.CreatedAt.UTC().Format(time.RFC3339Nano),
		}
	}

	return writeSSEPayload(w, flusher, payload)
}

func writeSSEError(w http.ResponseWriter, flusher http.Flusher, sessionID string, message string, err error) {
	details := ""
	if err != nil {
		details = err.Error()
	}

	payload := map[string]interface{}{
		"type":       "error",
		"session_id": sessionID,
		"error":      message,
	}

	if details != "" {
		payload["details"] = details
	}

	_ = writeSSEPayload(w, flusher, payload)
}

func writeSSESearchStart(w http.ResponseWriter, flusher http.Flusher, sessionID string, message string) error {
	payload := map[string]interface{}{
		"type":       "web-search-start",
		"session_id": sessionID,
	}
	if message != "" {
		payload["message"] = message
	}
	return writeSSEPayload(w, flusher, payload)
}

func writeSSESearchProgress(w http.ResponseWriter, flusher http.Flusher, sessionID string) error {
	payload := map[string]interface{}{
		"type":       "web-search-progress",
		"session_id": sessionID,
	}
	return writeSSEPayload(w, flusher, payload)
}

func writeSSESearchEnd(w http.ResponseWriter, flusher http.Flusher, sessionID string) error {
	payload := map[string]interface{}{
		"type":       "web-search-end",
		"session_id": sessionID,
	}
	return writeSSEPayload(w, flusher, payload)
}
func writeSSEMessageAck(w http.ResponseWriter, flusher http.Flusher, sessionID, clientMessageID string, message *models.ConversationMessage, attachments []processedAttachment) error {
	attachmentPayloads := make([]map[string]interface{}, 0, len(attachments))
	for _, att := range attachments {
		if att.Attachment == nil {
			continue
		}

		var publicURL string
		if att.Attachment.PublicURL != nil {
			publicURL = *att.Attachment.PublicURL
		}

		payloadEntry := map[string]interface{}{
			"client_id":  att.ClientID,
			"id":         att.Attachment.ID,
			"file_name":  att.Attachment.FileName,
			"mime_type":  att.Attachment.MimeType,
			"size_bytes": att.Attachment.SizeBytes,
			"public_url": publicURL,
			"source":     att.Attachment.Source,
		}
		if att.FileID != "" {
			payloadEntry["file_id"] = att.FileID
		}

		attachmentPayloads = append(attachmentPayloads, payloadEntry)
	}

	payload := map[string]interface{}{
		"type":              "message-ack",
		"session_id":        sessionID,
		"client_message_id": clientMessageID,
		"message": map[string]interface{}{
			"id":          message.ID,
			"remote_id":   message.ID,
			"channel":     message.Channel,
			"created_at":  message.CreatedAt.UTC().Format(time.RFC3339Nano),
			"attachments": attachmentPayloads,
		},
	}

	return writeSSEPayload(w, flusher, payload)
}

func (h *ChatHandler) processAttachments(ctx context.Context, session *models.ConversationSession, userID, messageID string, payloads []ChatAttachmentPayload) ([]processedAttachment, error) {
	if len(payloads) == 0 {
		return nil, nil
	}

	if h.b2Client == nil {
		return nil, fmt.Errorf("attachments not supported")
	}

	processed := make([]processedAttachment, 0, len(payloads))

	for _, payload := range payloads {
		if payload.Data == "" {
			return nil, fmt.Errorf("attachment %s missing data", payload.ID)
		}

		data, err := decodeBase64Data(payload.Data)
		if err != nil {
			return nil, fmt.Errorf("failed to decode attachment %s: %w", payload.ID, err)
		}

		sha := sha256.Sum256(data)
		hashHex := fmt.Sprintf("%x", sha[:])

		originalName := strings.TrimSpace(payload.FileName)
		if originalName == "" {
			originalName = fmt.Sprintf("attachment-%s.bin", uuid.NewString())
		}
		baseName := filepath.Base(originalName)
		storedFileName := fmt.Sprintf("chat/%s/%s_%s", session.ID, uuid.NewString(), sanitizeFileName(baseName))

		uploadURL, err := h.b2Client.GetUploadURL()
		if err != nil {
			return nil, fmt.Errorf("failed to get B2 upload url: %w", err)
		}

		contentType := payload.MimeType
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		uploadResp, err := h.b2Client.UploadFile(uploadURL.UploadURL, uploadURL.AuthorizationToken, storedFileName, contentType, data)
		if err != nil {
			return nil, fmt.Errorf("failed to upload attachment %s: %w", payload.ID, err)
		}

		fileID, err := h.uploadAttachmentToOpenAI(ctx, baseName, contentType, data)
		if err != nil {
			return nil, fmt.Errorf("failed to upload attachment %s to OpenAI: %w", payload.ID, err)
		}

		publicURL := h.b2Client.GetFileURL(uploadResp.FileName)
		sizeBytes := payload.SizeBytes
		if sizeBytes <= 0 {
			sizeBytes = int64(len(data))
		}

		shaCopy := hashHex
		source := payload.Source
		var metadataRaw *json.RawMessage
		if fileID != "" {
			meta := map[string]string{
				"openai_file_id": fileID,
			}
			if metaBytes, err := json.Marshal(meta); err == nil {
				metadataRaw = (*json.RawMessage)(&metaBytes)
			} else {
				return nil, fmt.Errorf("failed to encode attachment metadata %s: %w", payload.ID, err)
			}
		}

		attachment := &models.ConversationAttachment{
			SessionID:  session.ID,
			MessageID:  &messageID,
			UploadedBy: userID,
			FileName:   baseName,
			MimeType:   contentType,
			SizeBytes:  sizeBytes,
			SHA256Hash: &shaCopy,
			B2BucketID: uploadResp.BucketID,
			B2FileID:   uploadResp.FileID,
			B2FileName: uploadResp.FileName,
			PublicURL:  &publicURL,
			Source:     &source,
			Status:     "stored",
			Metadata:   metadataRaw,
		}

		if _, err := h.conversationRepo.CreateAttachment(attachment); err != nil {
			return nil, err
		}

		processed = append(processed, processedAttachment{
			ClientID:   payload.ID,
			Attachment: attachment,
			FileID:     fileID,
		})
	}

	return processed, nil
}

func decodeBase64Data(data string) ([]byte, error) {
	parts := strings.SplitN(data, ",", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid data url")
	}
	return base64.StdEncoding.DecodeString(parts[1])
}

func sanitizeFileName(name string) string {
	cleaned := strings.ReplaceAll(name, "\\", "")
	cleaned = strings.ReplaceAll(cleaned, "/", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "-")
	if cleaned == "" {
		cleaned = fmt.Sprintf("attachment-%s.bin", uuid.NewString())
	}
	return cleaned
}

type uploadableReader struct {
	*bytes.Reader
	filename    string
	contentType string
}

func (u *uploadableReader) Filename() string {
	return u.filename
}

func (u *uploadableReader) ContentType() string {
	return u.contentType
}

func (h *ChatHandler) uploadAttachmentToOpenAI(ctx context.Context, filename, mimeType string, data []byte) (string, error) {
	if h.openaiClient == nil {
		return "", nil
	}

	reader := &uploadableReader{
		Reader:      bytes.NewReader(data),
		filename:    filename,
		contentType: mimeType,
	}

	file, err := h.openaiClient.Files.New(ctx, openai.FileNewParams{
		File:    reader,
		Purpose: openai.FilePurposeUserData,
	})
	if err != nil {
		return "", err
	}

	return file.ID, nil
}

func extractAttachmentFileID(att models.ConversationAttachment, processed map[string]processedAttachment) string {
	if pa, ok := processed[att.ID]; ok && pa.FileID != "" {
		return pa.FileID
	}

	if att.Metadata != nil {
		var meta map[string]interface{}
		if err := json.Unmarshal(*att.Metadata, &meta); err == nil {
			if raw, ok := meta["openai_file_id"]; ok {
				if id, ok := raw.(string); ok {
					return id
				}
			}
		}
	}

	return ""
}
