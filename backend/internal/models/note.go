package models

import "time"

type Note struct {
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	FolderID         *string    `json:"folder_id,omitempty"`
	Title            string     `json:"title"`
	NoteMarkdown     string     `json:"note_markdown"`
	TranscriptText   string     `json:"transcript_text"`
	EnhancedMarkdown string     `json:"enhanced_markdown"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`
}
