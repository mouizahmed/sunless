package chunks

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/retrieval"
	openai "github.com/openai/openai-go/v3"
)

const (
	chunkCursorType = "chunk_cursor"
)

// Service creates rolling conversation chunks and upserts them into the Pinecone chunk index.
type Service struct {
	conversationRepo *repository.ConversationRepository
	retriever        *retrieval.RetrievalService
	openaiClient     *openai.Client

	minMessages int
	windowSize  int
	overlap     int
}

func NewService(convRepo *repository.ConversationRepository, retriever *retrieval.RetrievalService, openaiClient *openai.Client) *Service {
	if convRepo == nil || retriever == nil || openaiClient == nil {
		return nil
	}

	return &Service{
		conversationRepo: convRepo,
		retriever:        retriever,
		openaiClient:     openaiClient,
		minMessages:      5,
		windowSize:       12,
		overlap:          2,
	}
}

// MaybeCreateChunk summarizes the next block of unsent messages and upserts a chunk vector.
func (s *Service) MaybeCreateChunk(ctx context.Context, session *models.ConversationSession) {
	if s == nil || session == nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	cursor, err := s.conversationRepo.GetSummary(session.ID, chunkCursorType)
	if err != nil {
		log.Printf("chunks: failed to load cursor for session %s: %v", session.ID, err)
		return
	}

	var anchor *string
	if cursor != nil && strings.TrimSpace(cursor.LastMessageID) != "" {
		last := cursor.LastMessageID
		anchor = &last
	}

	messages, err := s.conversationRepo.ListMessagesAfter(session.ID, anchor, s.windowSize)
	if err != nil {
		log.Printf("chunks: failed to list messages for session %s: %v", session.ID, err)
		return
	}
	if len(messages) < s.minMessages {
		return
	}

	chunkID := uuid.NewString()
	text := buildChunkRawText(messages)

	summary, err := s.summarizeChunk(ctx, text)
	if err != nil {
		log.Printf("chunks: failed to summarize chunk %s: %v", chunkID, err)
	}
	if summary == "" {
		summary = truncateString(text, 320)
	}

	payload := retrieval.ChunkPayload{
		ChunkID:        chunkID,
		UserID:         session.UserID,
		SessionID:      session.ID,
		StartMessageID: messages[0].ID,
		EndMessageID:   messages[len(messages)-1].ID,
		MessageIDs:     extractMessageIDs(messages),
		Summary:        summary,
		VectorText:     summary,
		CreatedAt:      time.Now(),
	}

	if payload.VectorText == "" {
		payload.VectorText = text
	}

	if err := s.retriever.UpsertChunkEmbedding(ctx, payload); err != nil {
		log.Printf("chunks: failed to upsert chunk %s into Pinecone: %v", chunkID, err)
		return
	}

	cursorMessageID := messages[len(messages)-1].ID
	if s.overlap > 0 && len(messages) > s.overlap {
		cursorMessageID = messages[len(messages)-s.overlap].ID
	}

	newCursor := &models.ConversationSummary{
		SessionID:     session.ID,
		Type:          chunkCursorType,
		Content:       fmt.Sprintf("chunk up to %s", cursorMessageID),
		LastMessageID: cursorMessageID,
	}

	if err := s.conversationRepo.UpsertSummary(newCursor); err != nil {
		log.Printf("chunks: failed to persist cursor for session %s: %v", session.ID, err)
	}
}

func (s *Service) summarizeChunk(ctx context.Context, text string) (string, error) {
	if strings.TrimSpace(text) == "" {
		return "", nil
	}

	prompt := fmt.Sprintf(`Summarize the following conversation segment into one or two sentences that capture key facts, decisions, or themes the assistant should remember. Avoid filler.

Conversation:
%s

Summary:`, text)

	resp, err := s.openaiClient.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4oMini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
	})
	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", nil
	}
	return strings.TrimSpace(resp.Choices[0].Message.Content), nil
}

func buildChunkRawText(messages []models.ConversationMessage) string {
	var b strings.Builder
	for _, msg := range messages {
		trimmed := strings.TrimSpace(msg.Content)
		if trimmed == "" {
			continue
		}
		role := strings.ToUpper(msg.Sender)
		b.WriteString(role)
		b.WriteString(": ")
		b.WriteString(trimmed)
		b.WriteString("\n")
	}
	return b.String()
}

func extractMessageIDs(messages []models.ConversationMessage) []string {
	result := make([]string, 0, len(messages))
	for _, msg := range messages {
		result = append(result, msg.ID)
	}
	return result
}

func truncateString(text string, max int) string {
	if len([]rune(text)) <= max {
		return text
	}
	runes := []rune(text)
	return strings.TrimSpace(string(runes[:max])) + "…"
}
