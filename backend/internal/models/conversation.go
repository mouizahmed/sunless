package models

import (
	"encoding/json"
	"time"
)

type ConversationSession struct {
	ID                string     `json:"id" db:"id"`
	UserID            string     `json:"user_id" db:"user_id"`
	ChatModelProvider string     `json:"chat_model_provider" db:"chat_model_provider"`
	ChatModelName     string     `json:"chat_model_name" db:"chat_model_name"`
	LiveModelProvider *string    `json:"live_model_provider,omitempty" db:"live_model_provider"`
	LiveModelName     *string    `json:"live_model_name,omitempty" db:"live_model_name"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type ConversationMessage struct {
	ID         string           `json:"id" db:"id"`
	SessionID  string           `json:"session_id" db:"session_id"`
	Channel    string           `json:"channel" db:"channel"`
	Sender     string           `json:"sender" db:"sender"`
	Content    string           `json:"content" db:"content"`
	TokenCount *int             `json:"token_count,omitempty" db:"token_count"`
	Metadata   *json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	CreatedAt  time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at" db:"updated_at"`
	DeletedAt  *time.Time       `json:"deleted_at,omitempty" db:"deleted_at"`
}

type ConversationAttachment struct {
	ID         string           `json:"id" db:"id"`
	SessionID  string           `json:"session_id" db:"session_id"`
	MessageID  *string          `json:"message_id,omitempty" db:"message_id"`
	UploadedBy string           `json:"uploaded_by" db:"uploaded_by"`
	FileName   string           `json:"file_name" db:"file_name"`
	MimeType   string           `json:"mime_type" db:"mime_type"`
	SizeBytes  int64            `json:"size_bytes" db:"size_bytes"`
	SHA256Hash *string          `json:"sha256_hash,omitempty" db:"sha256_hash"`
	B2BucketID string           `json:"b2_bucket_id" db:"b2_bucket_id"`
	B2FileID   string           `json:"b2_file_id" db:"b2_file_id"`
	B2FileName string           `json:"b2_file_name" db:"b2_file_name"`
	PublicURL  *string          `json:"public_url,omitempty" db:"public_url"`
	Source     *string          `json:"source,omitempty" db:"source"`
	Status     string           `json:"status" db:"status"`
	Metadata   *json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	CreatedAt  time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at" db:"updated_at"`
	DeletedAt  *time.Time       `json:"deleted_at,omitempty" db:"deleted_at"`
}

type ConversationSummary struct {
	ID            string    `json:"id" db:"id"`
	SessionID     string    `json:"session_id" db:"session_id"`
	Type          string    `json:"type" db:"type"`
	Content       string    `json:"content" db:"content"`
	LastMessageID string    `json:"last_message_id" db:"last_message_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}
