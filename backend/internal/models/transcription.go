package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Transcription struct {
	ID           uuid.UUID       `json:"id" db:"id"`
	UserID       string          `json:"user_id" db:"user_id"`
	FileID       uuid.UUID       `json:"file_id" db:"file_id"`
	GlossaryID   *uuid.UUID      `json:"glossary_id" db:"glossary_id"`
	LanguageCode *string         `json:"language_code" db:"language_code"`
	Status       string          `json:"status" db:"status"`
	Model        string          `json:"model" db:"model"`
	Settings     json.RawMessage `json:"settings" db:"settings"`
	JobID        *string         `json:"job_id" db:"job_id"`
	ErrorMessage *string         `json:"error_message" db:"error_message"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time      `json:"deleted_at" db:"deleted_at"`
}

type Speaker struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	TranscriptionID uuid.UUID  `json:"transcription_id" db:"transcription_id"`
	SpeakerNumber   int        `json:"speaker_number" db:"speaker_number"`
	DisplayName     *string    `json:"display_name" db:"display_name"`
	Color           *string    `json:"color" db:"color"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt       *time.Time `json:"deleted_at" db:"deleted_at"`
}

type TranscriptSegment struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	TranscriptionID uuid.UUID  `json:"transcription_id" db:"transcription_id"`
	SpeakerID       *uuid.UUID `json:"speaker_id" db:"speaker_id"`
	Text            string     `json:"text" db:"text"`
	StartTime       float64    `json:"start_time" db:"start_time"`
	EndTime         float64    `json:"end_time" db:"end_time"`
	Confidence      *float64   `json:"confidence" db:"confidence"`
	SequenceNumber  int        `json:"sequence_number" db:"sequence_number"`
	LanguageCode    *string    `json:"language_code" db:"language_code"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

type TranscriptionSettings struct {
	SpeakerDetection bool `json:"speaker_detection"`
	FillerDetection  bool `json:"filler_detection"`
}

type BatchCreateTranscriptionsRequest struct {
	FileIDs      []uuid.UUID           `json:"file_ids" binding:"required,min=1"`
	FolderID     *uuid.UUID            `json:"folder_id"`
	GlossaryID   *uuid.UUID            `json:"glossary_id"`
	LanguageCode *string               `json:"language_code"`
	Model        string                `json:"model" binding:"required"`
	Settings     TranscriptionSettings `json:"settings"`
}

type TranscriptionResponse struct {
	ID     uuid.UUID `json:"id"`
	FileID uuid.UUID `json:"file_id"`
	Status string    `json:"status"`
	JobID  *string   `json:"job_id"`
}

type BatchCreateTranscriptionsResponse struct {
	Success        bool                    `json:"success"`
	Transcriptions []TranscriptionResponse `json:"transcriptions"`
}
