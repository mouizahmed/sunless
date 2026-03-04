package models

import "time"

type TranscriptSegment struct {
	ID           string    `json:"id"`
	NoteID       string    `json:"note_id"`
	Channel      int       `json:"channel"`
	Text         string    `json:"text"`
	StartTime    *float64  `json:"start_time,omitempty"`
	EndTime      *float64  `json:"end_time,omitempty"`
	SegmentIndex int       `json:"segment_index"`
	CreatedAt    time.Time `json:"created_at"`
}
