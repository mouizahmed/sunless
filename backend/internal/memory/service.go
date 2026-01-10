package memory

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/retrieval"
	openai "github.com/openai/openai-go/v3"
)

type Service struct {
	conversationRepo *repository.ConversationRepository
	memoryRepo       *repository.MemoryRepository
	retriever        *retrieval.RetrievalService
	openaiClient     *openai.Client
	minMessages      int
	windowSize       int
}

func NewService(convRepo *repository.ConversationRepository, memRepo *repository.MemoryRepository, retriever *retrieval.RetrievalService, openaiClient *openai.Client) *Service {
	if convRepo == nil || memRepo == nil || openaiClient == nil {
		return nil
	}
	return &Service{
		conversationRepo: convRepo,
		memoryRepo:       memRepo,
		retriever:        retriever,
		openaiClient:     openaiClient,
		minMessages:      10,
		windowSize:       40,
	}
}

type llmMemoryResponse struct {
	Remember   bool   `json:"remember"`
	Importance int    `json:"importance"`
	Summary    string `json:"summary"`
}

func (s *Service) MaybeCreateMemory(ctx context.Context, session *models.ConversationSession, triggerMessage *models.ConversationMessage) {
	if s == nil || session == nil || triggerMessage == nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	lastMemory, err := s.memoryRepo.GetLatestMemoryForSession(session.ID)
	if err != nil {
		log.Printf("memory: failed to load latest memory for session %s: %v", session.ID, err)
		return
	}

	var anchor *string
	if lastMemory != nil && lastMemory.EndMessageID != nil {
		anchor = lastMemory.EndMessageID
	}

	messages, err := s.conversationRepo.ListMessagesAfter(session.ID, anchor, s.windowSize)
	if err != nil {
		log.Printf("memory: failed to load messages for session %s: %v", session.ID, err)
		return
	}
	if len(messages) < s.minMessages {
		return
	}

	payload := buildConversationPayload(messages)
	if strings.TrimSpace(payload) == "" {
		return
	}

	prompt := fmt.Sprintf(`You extract only durable, long-term information about a user from raw conversation.
Return strict JSON matching this schema:
{
  "remember": boolean,
  "importance": 1 | 2 | 3,
  "summary": string
}

"remember" must be true only if the content reflects user preferences, constraints, commitments, recurring plans, or decisions that will matter later.
Use importance 3 for critical facts (health, legal, financial commitments), 2 for important medium-term work, 1 for everything else.
Keep summary under 250 characters and avoid redundancy.

Conversation:
%s`, payload)

	completion, err := s.openaiClient.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4oMini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
	})
	if err != nil {
		log.Printf("memory: LLM summarize failed: %v", err)
		return
	}

	if len(completion.Choices) == 0 {
		return
	}

	var parsed llmMemoryResponse
	rawOutput := completion.Choices[0].Message.Content
	if err := decodeLLMJSON(rawOutput, &parsed); err != nil {
		log.Printf("memory: failed to parse summarize output: %v", err)
		return
	}

	summary := strings.TrimSpace(parsed.Summary)
	if !parsed.Remember || summary == "" {
		return
	}

	importance := parsed.Importance
	if importance < 1 || importance > 3 {
		importance = 1
	}

	startID := messages[0].ID
	endID := messages[len(messages)-1].ID

	newMemory := &models.Memory{
		UserID:         session.UserID,
		SessionID:      &session.ID,
		StartMessageID: &startID,
		EndMessageID:   &endID,
		Summary:        summary,
		Importance:     importance,
	}

	created, err := s.memoryRepo.CreateMemory(newMemory)
	if err != nil {
		log.Printf("memory: failed to persist memory: %v", err)
		return
	}

	if s.retriever != nil {
		if vectorID, err := s.retriever.UpsertMemoryEmbedding(ctx, created); err != nil {
			log.Printf("memory: failed to upsert vector for memory %s: %v", created.ID, err)
		} else if vectorID != "" {
			if err := s.memoryRepo.UpdateMemoryVectorID(created.ID, vectorID); err != nil {
				log.Printf("memory: failed to store vector id for memory %s: %v", created.ID, err)
			}
		}
	}
}

func buildConversationPayload(messages []models.ConversationMessage) string {
	var builder strings.Builder
	for _, msg := range messages {
		role := strings.ToUpper(msg.Sender)
		if role == "" {
			role = "SYSTEM"
		}
		text := strings.TrimSpace(msg.Content)
		if text == "" {
			continue
		}
		builder.WriteString(fmt.Sprintf("%s: %s\n", role, text))
	}
	return builder.String()
}

func decodeLLMJSON(raw string, target interface{}) error {
	clean := strings.TrimSpace(raw)
	if strings.HasPrefix(clean, "```") {
		clean = strings.TrimPrefix(clean, "```")
		clean = strings.TrimSpace(clean)
		if idx := strings.Index(clean, "\n"); idx != -1 {
			header := clean[:idx]
			if !strings.HasPrefix(header, "{") {
				clean = clean[idx+1:]
			}
		}
		if end := strings.LastIndex(clean, "```"); end != -1 {
			clean = clean[:end]
		}
		clean = strings.TrimSpace(clean)
	}
	return json.Unmarshal([]byte(clean), target)
}
