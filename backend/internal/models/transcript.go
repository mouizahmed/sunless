package models

import "time"

type TranscriptSpeaker struct {
	ID         string    `json:"id"`
	NoteID     string    `json:"note_id"`
	UserID     string    `json:"user_id"`
	SpeakerKey int       `json:"speaker_key"`
	Channel    int       `json:"channel"`
	Label      string    `json:"label"`
	Color      string    `json:"color"`
	CreatedAt  time.Time `json:"created_at"`
}

type TranscriptSegment struct {
	ID           string    `json:"id"`
	NoteID       string    `json:"note_id"`
	SpeakerID    string    `json:"speaker_id"`
	Text         string    `json:"text"`
	StartTime    *float64  `json:"start_time,omitempty"`
	EndTime      *float64  `json:"end_time,omitempty"`
	SegmentIndex int       `json:"segment_index"`
	CreatedAt    time.Time `json:"created_at"`
}
