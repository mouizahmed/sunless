package models

import "time"

type NoteAttachment struct {
	ID         string     `json:"id"`
	NoteID     string     `json:"note_id"`
	UserID     string     `json:"user_id"`
	FileName   string     `json:"file_name"`
	MimeType   string     `json:"mime_type"`
	SizeBytes  int64      `json:"size_bytes"`
	B2FileID   string     `json:"b2_file_id"`
	B2FileName string     `json:"b2_file_name"`
	PublicURL  string     `json:"public_url"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty"`
}
