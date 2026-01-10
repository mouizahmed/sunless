package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/chunks"
	"github.com/mouizahmed/justscribe-backend/internal/memory"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/prompts"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/retrieval"
	"github.com/mouizahmed/justscribe-backend/internal/storage"
	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/packages/param"
	responses "github.com/openai/openai-go/v3/responses"
	"github.com/openai/openai-go/v3/shared"
	"github.com/pkoukk/tiktoken-go"
)

var ErrMissingOpenAIApiKey = errors.New("OPENAI_API_KEY is not configured")

type ChatHandler struct {
	conversationRepo *repository.ConversationRepository
	memoryRepo       *repository.MemoryRepository
	openaiClient     *openai.Client
	b2Client         *storage.B2Client
	apiConfigured    bool
	retrieval        *retrieval.RetrievalService
	memoryService    *memory.Service
	chunkService     *chunks.Service
	historyLimit     int
	memoryTopK       int
	chunkTopK        int
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

type memoryContextEntry struct {
	Summary    string
	Importance int
	Score      float32
}

type chunkContextEntry struct {
	Summary    string
	Score      float32
	MessageIDs []string
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

func NewChatHandler(conversationRepo *repository.ConversationRepository, memoryRepo *repository.MemoryRepository, b2Client *storage.B2Client) (*ChatHandler, error) {
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" {
		return &ChatHandler{
			conversationRepo: conversationRepo,
			memoryRepo:       memoryRepo,
			openaiClient:     nil,
			b2Client:         b2Client,
			apiConfigured:    false,
			historyLimit:     40,
			memoryTopK:       6,
		}, ErrMissingOpenAIApiKey
	}

	client := openai.NewClient(option.WithAPIKey(apiKey))

	retrievalService, err := retrieval.NewRetrievalService(&client)
	if err != nil {
		log.Printf("chat: failed to initialize retrieval service: %v", err)
	}

	var memoryService *memory.Service
	var chunkService *chunks.Service
	if retrievalService != nil {
		if memoryRepo != nil {
			memoryService = memory.NewService(conversationRepo, memoryRepo, retrievalService, &client)
		}
		chunkService = chunks.NewService(conversationRepo, retrievalService, &client)
	}

	return &ChatHandler{
		conversationRepo: conversationRepo,
		memoryRepo:       memoryRepo,
		openaiClient:     &client,
		b2Client:         b2Client,
		apiConfigured:    true,
		retrieval:        retrievalService,
		memoryService:    memoryService,
		chunkService:     chunkService,
		historyLimit:     40,
		memoryTopK:       6,
		chunkTopK:        4,
	}, nil
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
			log.Printf("chat: failed to create session for user %s: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "failed to create session",
				"details": err.Error(),
			})
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

	if err := h.conversationRepo.TouchSessionUpdatedAt(session.ID); err != nil {
		log.Printf("chat: failed to bump session timestamp %s: %v", session.ID, err)
	}

	processedAttachments, err := h.processAttachments(c.Request.Context(), session, userID, userMessage.ID, req.Attachments)
	if err != nil {
		log.Printf("chat: failed to process attachments for session %s: %v", session.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store attachments", "details": err.Error()})
		return
	}

	if h.memoryService != nil {
		go h.memoryService.MaybeCreateMemory(context.Background(), session, userMessage)
	}
	if h.chunkService != nil {
		go h.chunkService.MaybeCreateChunk(context.Background(), session)
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

	historyLimit := h.historyLimit
	if historyLimit <= 0 {
		historyLimit = 20
	}

	recentMessages, err := h.conversationRepo.ListRecentMessages(session.ID, historyLimit)
	if err != nil {
		log.Printf("chat: failed to retrieve recent messages for session %s: %v", session.ID, err)
		writeSSEError(c.Writer, flusher, session.ID, "failed to retrieve conversation", err)
		return
	}

	foundCurrent := false
	for _, msg := range recentMessages {
		if msg.ID == userMessage.ID {
			foundCurrent = true
			break
		}
	}
	if !foundCurrent {
		recentMessages = append(recentMessages, *userMessage)
	}

	historyMessages := make([]models.ConversationMessage, 0, len(recentMessages))
	for _, msg := range recentMessages {
		if msg.ID == userMessage.ID {
			continue
		}
		historyMessages = append(historyMessages, msg)
	}

	isLiveTurn := channel == "live"
	var liveSummary *models.ConversationSummary
	if isLiveTurn {
		summaryWindow := make([]models.ConversationMessage, 0, len(historyMessages)+1)
		summaryWindow = append(summaryWindow, historyMessages...)
		summaryWindow = append(summaryWindow, *userMessage)
		liveSummary, err = h.maybeUpdateLiveSummary(c.Request.Context(), session.ID, summaryWindow)
		if err != nil {
			log.Printf("chat: failed to update live summary for session %s: %v", session.ID, err)
		}
	}

	memoryEntries, err := h.loadMemoryContext(c.Request.Context(), userID, req.Message)
	if err != nil {
		log.Printf("chat: failed to retrieve memories for session %s: %v", session.ID, err)
	}

	chunkEntries, err := h.loadChunkContext(c.Request.Context(), userID, session.ID, req.Message)
	if err != nil {
		log.Printf("chat: failed to retrieve chunks for session %s: %v", session.ID, err)
	}

	messageIDs := make([]string, 0, len(historyMessages)+1)
	for _, msg := range historyMessages {
		messageIDs = append(messageIDs, msg.ID)
	}
	messageIDs = append(messageIDs, userMessage.ID)

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

	inputItems := make([]responses.ResponseInputItemUnionParam, 0)
	inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(prompts.SunlessSystemPrompt, responses.EasyInputMessageRoleSystem))

	if isLiveTurn && liveSummary != nil && strings.TrimSpace(liveSummary.Content) != "" {
		inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(
			fmt.Sprintf("Current live summary:\n%s", strings.TrimSpace(liveSummary.Content)),
			responses.EasyInputMessageRoleSystem,
		))
	}

	if len(memoryEntries) > 0 {
		var builder strings.Builder
		builder.WriteString("Relevant long term context:\n")
		for _, entry := range memoryEntries {
			builder.WriteString(fmt.Sprintf("- %s\n", entry.Summary))
		}
		inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(builder.String(), responses.EasyInputMessageRoleSystem))
	}

	if len(chunkEntries) > 0 {
		var builder strings.Builder
		builder.WriteString("Retrieved conversation chunks:\n")
		for _, entry := range chunkEntries {
			builder.WriteString(fmt.Sprintf("- %s\n", entry.Summary))
		}
		inputItems = append(inputItems, responses.ResponseInputItemParamOfMessage(builder.String(), responses.EasyInputMessageRoleSystem))
	}

	for _, msg := range historyMessages {
		role := responses.EasyInputMessageRoleUser
		if msg.Sender == "assistant" {
			role = responses.EasyInputMessageRoleAssistant
		}

		plain, parts, attachmentCount := h.buildMessageContent(msg, attachmentsByMessage[msg.ID], false, processedByAttachmentID)
		if len(parts) == 0 {
			continue
		}

		var item responses.ResponseInputItemUnionParam
		if attachmentCount == 0 && plain != "" && len(parts) == 1 {
			item = responses.ResponseInputItemParamOfMessage(plain, role)
		} else {
			item = responses.ResponseInputItemParamOfMessage(responses.ResponseInputMessageContentListParam(parts), role)
		}

		inputItems = append(inputItems, item)
	}

	currentPlain, currentParts, currentAttachmentCount := h.buildMessageContent(*userMessage, attachmentsByMessage[userMessage.ID], true, processedByAttachmentID)
	if len(currentParts) > 0 {
		role := responses.EasyInputMessageRoleUser
		var userItem responses.ResponseInputItemUnionParam
		if currentAttachmentCount == 0 && currentPlain != "" && len(currentParts) == 1 {
			userItem = responses.ResponseInputItemParamOfMessage(currentPlain, role)
		} else {
			userItem = responses.ResponseInputItemParamOfMessage(responses.ResponseInputMessageContentListParam(currentParts), role)
		}
		inputItems = append(inputItems, userItem)
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

	// NOTE: We intentionally do NOT upsert assistant messages to Pinecone.
	// Reasons:
	// 1. Assistant responses are already passed in recent messages (last 20)
	// 2. Storing them can cause circular retrieval - the assistant's own responses
	//    get retrieved as "context", which can reinforce errors
	// 3. It wastes retrieval slots that could be used for user-provided information

	if err := writeSSEDone(c.Writer, flusher, session.ID, assistantMessage); err != nil {
		log.Printf("chat: failed to stream completion event for session %s: %v", session.ID, err)
	}
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
			"client_id": att.ClientID,
			"id":        att.Attachment.ID,
			"url":       publicURL,
		}
		attachmentPayloads = append(attachmentPayloads, payloadEntry)
	}

	payload := map[string]interface{}{
		"type":              "ack",
		"session_id":        sessionID,
		"client_message_id": clientMessageID,
		"message_id":        message.ID,
		"attachments":       attachmentPayloads,
	}

	return writeSSEPayload(w, flusher, payload)
}

func (h *ChatHandler) buildMessageContent(msg models.ConversationMessage, attachments []models.ConversationAttachment, includeFiles bool, processed map[string]processedAttachment) (string, []responses.ResponseInputContentUnionParam, int) {
	trimmed := strings.TrimSpace(msg.Content)
	contentParts := make([]responses.ResponseInputContentUnionParam, 0)
	if trimmed != "" {
		contentParts = append(contentParts, responses.ResponseInputContentParamOfInputText(trimmed))
	}

	attachmentCount := 0
	for _, att := range attachments {
		if att.DeletedAt != nil {
			continue
		}
		attachmentCount++

		if includeFiles {
			fileID := extractAttachmentFileID(att, processed)
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
			contentParts = append(contentParts, responses.ResponseInputContentParamOfInputText(fmt.Sprintf("%s (%s)", description, att.MimeType)))
		} else {
			desc := fmt.Sprintf("[Attachment: %s (%s)]", att.FileName, att.MimeType)
			contentParts = append(contentParts, responses.ResponseInputContentParamOfInputText(desc))
		}
	}

	return trimmed, contentParts, attachmentCount
}

func (h *ChatHandler) loadMemoryContext(ctx context.Context, userID string, query string) ([]memoryContextEntry, error) {
	if h.retrieval == nil || h.memoryRepo == nil {
		log.Printf("chat: memory retrieval skipped user=%s reason=retrieval-disabled", userID)
		return nil, nil
	}
	query = strings.TrimSpace(query)
	if query == "" {
		log.Printf("chat: memory retrieval skipped user=%s reason=empty-query", userID)
		return nil, nil
	}

	matches, err := h.retrieval.QueryMemories(ctx, userID, query, h.memoryTopK)
	if err != nil {
		return nil, err
	}
	if len(matches) == 0 {
		log.Printf("chat: memory retrieval user=%s query=%q hits=0 (pinecone)", userID, query)
		return nil, nil
	}

	ids := make([]string, 0, len(matches))
	for _, match := range matches {
		ids = append(ids, match.MemoryID)
	}

	memoryMap, err := h.memoryRepo.GetMemoriesByIDs(ids)
	if err != nil {
		return nil, err
	}

	entries := make([]memoryContextEntry, 0, len(matches))
	for _, match := range matches {
		mem, ok := memoryMap[match.MemoryID]
		if !ok {
			log.Printf("chat: memory retrieval missing row user=%s memory_id=%s", userID, match.MemoryID)
			continue
		}
		summary := strings.TrimSpace(mem.Summary)
		if summary == "" {
			continue
		}
		entries = append(entries, memoryContextEntry{
			Summary:    summary,
			Importance: mem.Importance,
			Score:      match.Score,
		})
	}

	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].Importance == entries[j].Importance {
			return entries[i].Score > entries[j].Score
		}
		return entries[i].Importance > entries[j].Importance
	})

	if len(entries) > h.memoryTopK && h.memoryTopK > 0 {
		entries = entries[:h.memoryTopK]
	}

	if len(entries) > 0 {
		logDetails := make([]string, 0, len(entries))
		for idx, entry := range entries {
			logDetails = append(logDetails, fmt.Sprintf("#%d importance=%d score=%.3f summary=%q", idx+1, entry.Importance, entry.Score, entry.Summary))
		}
		log.Printf("chat: memory retrieval user=%s query=%q hits=%d %s", userID, query, len(entries), strings.Join(logDetails, "; "))
	} else {
		log.Printf("chat: memory retrieval user=%s query=%q hits=0", userID, query)
	}

	return entries, nil
}

func (h *ChatHandler) loadChunkContext(ctx context.Context, userID, sessionID, query string) ([]chunkContextEntry, error) {
	if h.retrieval == nil {
		log.Printf("chat: chunk retrieval skipped user=%s reason=retrieval-disabled", userID)
		return nil, nil
	}
	query = strings.TrimSpace(query)
	if query == "" {
		log.Printf("chat: chunk retrieval skipped user=%s reason=empty-query", userID)
		return nil, nil
	}

	matches, err := h.retrieval.QueryChunks(ctx, userID, sessionID, query, h.chunkTopK)
	if err != nil {
		return nil, err
	}
	if len(matches) == 0 {
		log.Printf("chat: chunk retrieval user=%s session=%s query=%q hits=0 (pinecone)", userID, sessionID, query)
		return nil, nil
	}

	entries := make([]chunkContextEntry, 0, len(matches))
	for _, match := range matches {
		if strings.TrimSpace(match.Summary) == "" {
			continue
		}
		entries = append(entries, chunkContextEntry{
			Summary:    strings.TrimSpace(match.Summary),
			Score:      match.Score,
			MessageIDs: match.MessageIDs,
		})
	}

	if len(entries) > 0 {
		var details []string
		for idx, entry := range entries {
			details = append(details, fmt.Sprintf("#%d score=%.3f summary=%q", idx+1, entry.Score, entry.Summary))
		}
		log.Printf("chat: chunk retrieval user=%s session=%s query=%q hits=%d %s", userID, sessionID, query, len(entries), strings.Join(details, "; "))
	}

	return entries, nil
}

func (h *ChatHandler) processAttachments(ctx context.Context, session *models.ConversationSession, userID string, messageID string, attachments []ChatAttachmentPayload) ([]processedAttachment, error) {
	var processed []processedAttachment
	if len(attachments) == 0 {
		return processed, nil
	}

	for _, payload := range attachments {
		data, err := decodeBase64Data(payload.Data)
		if err != nil {
			log.Printf("failed to decode attachment %s: %v", payload.FileName, err)
			continue
		}

		filename := sanitizeFileName(payload.FileName)
		mimeType := payload.MimeType
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		// Upload to B2
		uploadURLResp, err := h.b2Client.GetUploadURL()
		if err != nil {
			return nil, fmt.Errorf("failed to get B2 upload URL: %w", err)
		}

		uploadResp, err := h.b2Client.UploadFile(uploadURLResp.UploadURL, uploadURLResp.AuthorizationToken, filename, mimeType, data)
		if err != nil {
			return nil, fmt.Errorf("failed to upload to B2: %w", err)
		}

		// Upload to OpenAI (optional, only if image/file type is supported)
		fileID, err := h.uploadAttachmentToOpenAI(ctx, filename, mimeType, data)
		if err != nil {
			log.Printf("failed to upload to OpenAI: %v", err)
			// Continue without OpenAI file ID
		}

		// Metadata
		metadata := map[string]interface{}{
			"b2_file_id":     uploadResp.FileID,
			"b2_bucket_id":   uploadResp.BucketID,
			"openai_file_id": fileID,
		}
		metadataRaw, _ := json.Marshal(metadata)
		metadataRawMessage := json.RawMessage(metadataRaw)

		publicURL := h.b2Client.GetFileURL(uploadResp.FileName)
		source := payload.Source

		attachment := &models.ConversationAttachment{
			SessionID:  session.ID,
			MessageID:  &messageID,
			UploadedBy: userID,
			FileName:   uploadResp.FileName,
			MimeType:   mimeType,
			SizeBytes:  uploadResp.FileSize,
			SHA256Hash: &uploadResp.ContentSHA1,
			B2BucketID: uploadResp.BucketID,
			B2FileID:   uploadResp.FileID,
			B2FileName: uploadResp.FileName,
			PublicURL:  &publicURL,
			Source:     &source,
			Status:     "stored",
			Metadata:   &metadataRawMessage,
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

func countTokens(text string) int {
	tkm, err := tiktoken.EncodingForModel("gpt-4")
	if err != nil {
		return len(strings.Fields(text))
	}
	token := tkm.Encode(text, nil, nil)
	return len(token)
}

func (h *ChatHandler) maybeUpdateLiveSummary(ctx context.Context, sessionID string, recentMessages []models.ConversationMessage) (*models.ConversationSummary, error) {
	summary, err := h.conversationRepo.GetSummary(sessionID, "live")
	if err != nil {
		return nil, err
	}

	var unsummarizedMessages []models.ConversationMessage
	lastMessageID := ""
	if summary != nil {
		lastMessageID = summary.LastMessageID
		found := false
		for _, msg := range recentMessages {
			if found {
				unsummarizedMessages = append(unsummarizedMessages, msg)
			} else if msg.ID == lastMessageID {
				found = true
			}
		}
		if !found && len(recentMessages) > 0 {
			unsummarizedMessages = recentMessages
		}
	} else {
		unsummarizedMessages = recentMessages
	}

	if len(unsummarizedMessages) == 0 {
		return summary, nil
	}

	totalTokens := 0
	for _, msg := range unsummarizedMessages {
		if msg.TokenCount != nil {
			totalTokens += *msg.TokenCount
		} else {
			totalTokens += countTokens(msg.Content)
		}
	}

	threshold := 1500
	if totalTokens < threshold {
		return summary, nil
	}

	log.Printf("Summarizing session %s with %d tokens", sessionID, totalTokens)

	existingContent := "None yet"
	if summary != nil {
		existingContent = summary.Content
	}

	prompt := fmt.Sprintf("SYSTEM:\nYou maintain a running summary of a conversation between user and assistant.\n\nEXISTING SUMMARY:\n%s\n\nNEW MESSAGES:\n", existingContent)

	for _, msg := range unsummarizedMessages {
		role := "USER"
		if msg.Sender == "assistant" {
			role = "ASSISTANT"
		}
		prompt += fmt.Sprintf("[%s]: %s\n", role, msg.Content)
	}

	prompt += "\nTASK:\nUpdate the summary so that it still fits within about 300 to 500 words.\nPreserve key facts, user goals, decisions, constraints, and important references to files or screenshots.\nDo not write a transcript.\nReturn only the updated summary text."

	completion, err := h.openaiClient.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
		Model: openai.ChatModelGPT4oMini,
	})
	if err != nil {
		log.Printf("failed to summarize: %v", err)
		return summary, nil
	}

	newContent := completion.Choices[0].Message.Content

	newSummary := &models.ConversationSummary{
		SessionID:     sessionID,
		Type:          "live",
		Content:       newContent,
		LastMessageID: unsummarizedMessages[len(unsummarizedMessages)-1].ID,
	}

	if err := h.conversationRepo.UpsertSummary(newSummary); err != nil {
		log.Printf("failed to upsert summary: %v", err)
		return summary, nil
	}

	return newSummary, nil
}
