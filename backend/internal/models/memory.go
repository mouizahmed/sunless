package models

import "time"

// Memory represents a distilled, long-term fact extracted from raw conversation messages.
type Memory struct {
	ID             string     `json:"id" db:"id"`
	UserID         string     `json:"user_id" db:"user_id"`
	SessionID      *string    `json:"session_id,omitempty" db:"session_id"`
	StartMessageID *string    `json:"start_message_id,omitempty" db:"start_message_id"`
	EndMessageID   *string    `json:"end_message_id,omitempty" db:"end_message_id"`
	Summary        string     `json:"summary" db:"summary"`
	Importance     int        `json:"importance" db:"importance"`
	VectorID       *string    `json:"vector_id,omitempty" db:"vector_id"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

