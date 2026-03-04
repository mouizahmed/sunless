package models

import "time"

type Message struct {
	ID               string    `json:"id"`
	ConversationID   string    `json:"conversation_id"`
	Role             string    `json:"role"`
	Content          string    `json:"content"`
	ToolCalls        *string   `json:"tool_calls,omitempty"`
	ToolCallID       *string   `json:"tool_call_id,omitempty"`
	Thinking         string    `json:"thinking,omitempty"`
	ThinkingDuration int       `json:"thinking_duration,omitempty"`
	TokenCount       int       `json:"token_count"`
	CreatedAt        time.Time `json:"created_at"`
}
