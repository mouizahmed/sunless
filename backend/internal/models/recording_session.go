package models

import "time"

type RecordingSession struct {
	ID               string     `json:"id"`
	NoteID           string     `json:"note_id"`
	UserID           string     `json:"user_id"`
	Status           string     `json:"status"`
	StartedAt        time.Time  `json:"started_at"`
	PausedAt         *time.Time `json:"paused_at,omitempty"`
	StoppedAt        *time.Time `json:"stopped_at,omitempty"`
	TranscriptChunks []byte     `json:"transcript_chunks,omitempty"`
	LastActivityAt   time.Time  `json:"last_activity_at"`
}
