package models

import "time"

type Conversation struct {
	ID                      string     `json:"id"`
	UserID                  string     `json:"user_id"`
	Title                   string     `json:"title"`
	Summary                 string     `json:"summary"`
	SummaryThroughMessageID *string    `json:"summary_through_message_id,omitempty"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
	DeletedAt               *time.Time `json:"deleted_at,omitempty"`
}
