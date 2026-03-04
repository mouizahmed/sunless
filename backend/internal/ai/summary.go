package ai

import (
	"encoding/json"

	"github.com/mouizahmed/justscribe-backend/internal/models"
)

const defaultSummaryThreshold = 80000
const recentMessageCount = 20

func ShouldSummarize(totalTokens int, threshold int) bool {
	if threshold <= 0 {
		threshold = defaultSummaryThreshold
	}
	return totalTokens > threshold
}

func BuildSlidingContext(existingSummary string, messages []models.Message, tokenBudget int) (contextMessages []Message, needsNewSummary bool) {
	if tokenBudget <= 0 {
		tokenBudget = defaultSummaryThreshold
	}

	result := []Message{}

	// If we have a summary, prepend it as context
	if existingSummary != "" {
		result = append(result, Message{
			Role:    "user",
			Content: "[Previous conversation summary]: " + existingSummary,
		})
		result = append(result, Message{
			Role:    "assistant",
			Content: "I understand the previous context. How can I help you?",
		})
	}

	// Take the last N messages (or all if fewer)
	start := 0
	if len(messages) > recentMessageCount {
		start = len(messages) - recentMessageCount
	}

	recent := messages[start:]

	// Calculate total tokens across all messages
	totalTokens := 0
	for _, msg := range messages {
		totalTokens += msg.TokenCount
	}

	for _, msg := range recent {
		switch msg.Role {
		case "user":
			result = append(result, Message{Role: "user", Content: msg.Content})

		case "assistant":
			m := Message{Role: "assistant", Content: msg.Content}
			// Reconstruct tool_calls if this is an intermediate assistant message.
			// Intermediate messages store [{id, name, args}]; display-only messages
			// store [{tool_name, result}] with no id field — those are skipped.
			if msg.ToolCalls != nil {
				var records []struct {
					ID   string `json:"id"`
					Name string `json:"name"`
					Args string `json:"args"`
				}
				if json.Unmarshal([]byte(*msg.ToolCalls), &records) == nil {
					for _, r := range records {
						if r.ID != "" {
							m.ToolCalls = append(m.ToolCalls, ToolCall{
								ID:    r.ID,
								Name:  r.Name,
								Input: r.Args,
							})
						}
					}
				}
			}
			result = append(result, m)

		case "tool":
			toolCallID := ""
			if msg.ToolCallID != nil {
				toolCallID = *msg.ToolCallID
			}
			result = append(result, Message{
				Role:       "tool",
				Content:    msg.Content,
				ToolCallID: toolCallID,
			})
		}
	}

	needsNewSummary = totalTokens > tokenBudget && len(messages) > recentMessageCount

	return result, needsNewSummary
}
