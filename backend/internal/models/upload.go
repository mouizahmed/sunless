package models

import (
	"time"

	"github.com/google/uuid"
)

type UploadFile struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	UserID      string     `json:"user_id" db:"user_id"`
	SourceURL   *string    `json:"source_url" db:"source_url"`
	StorageKey  *string    `json:"storage_key" db:"storage_key"`
	StorageURL  *string    `json:"storage_url" db:"storage_url"`
	SizeBytes   int64      `json:"size_bytes" db:"size_bytes"`
	ContentType string     `json:"content_type" db:"content_type"`
	Duration    *float64   `json:"duration" db:"duration"`
	FileHash    *string    `json:"file_hash" db:"file_hash"`
	UploadID    *string    `json:"upload_id" db:"upload_id"`
	Status      string     `json:"status" db:"status"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at" db:"deleted_at"`
}

// Request/Response models for upload endpoints

type InitiateUploadRequest struct {
	FileName    string   `json:"file_name" binding:"required"`
	FileSize    int64    `json:"file_size" binding:"required,max=2147483648"` // 2GB max
	ContentType string   `json:"content_type" binding:"required"`
	Duration    *float64 `json:"duration,omitempty"`
}

type ChunkURL struct {
	ChunkNumber        int    `json:"chunk_number"`
	URL                string `json:"url"`
	AuthorizationToken string `json:"authorization_token"`
}

type InitiateUploadResponse struct {
	FileID      uuid.UUID  `json:"file_id"`
	ChunkURLs   []ChunkURL `json:"chunk_urls"`
	TotalChunks int        `json:"total_chunks"`
	ChunkSize   int        `json:"chunk_size"`
	StorageKey  string     `json:"storage_key"`
}

type CompleteUploadRequest struct {
	FileID uuid.UUID       `json:"file_id" binding:"required"`
	Parts  []CompletedPart `json:"parts" binding:"required"`
}

type CompletedPart struct {
	PartNumber int    `json:"part_number" binding:"required"`
	ETag       string `json:"etag" binding:"required"`
}

type UploadCompleteResponse struct {
	FileID  uuid.UUID `json:"file_id"`
	FileURL string    `json:"file_url"`
	Message string    `json:"message"`
}
