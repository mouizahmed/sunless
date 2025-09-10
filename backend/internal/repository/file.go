package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type FileRepository struct {
	db *database.DB
}

func NewFileRepository(db *database.DB) *FileRepository {
	return &FileRepository{db: db}
}

func (r *FileRepository) CreateFile(file *models.UploadFile) error {
	query := `
		INSERT INTO files (name, user_id, source_url, storage_key, 
		                  storage_url, size_bytes, content_type, duration, 
		                  file_hash, upload_id, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(query,
		file.Name, file.UserID, file.SourceURL,
		file.StorageKey, file.StorageURL, file.SizeBytes, file.ContentType,
		file.Duration, file.FileHash, file.UploadID, file.Status,
	).Scan(&file.ID, &file.CreatedAt, &file.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create file record: %w", err)
	}
	return nil
}

func (r *FileRepository) GetFileByID(id uuid.UUID, userID string) (*models.UploadFile, error) {
	query := `
		SELECT id, name, user_id, source_url, storage_key,
		       storage_url, size_bytes, content_type, duration, file_hash,
		       upload_id, status, created_at, updated_at, deleted_at
		FROM files 
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`

	file := &models.UploadFile{}
	err := r.db.QueryRow(query, id, userID).Scan(
		&file.ID, &file.Name, &file.UserID,
		&file.SourceURL, &file.StorageKey, &file.StorageURL,
		&file.SizeBytes, &file.ContentType, &file.Duration,
		&file.FileHash, &file.UploadID, &file.Status, &file.CreatedAt,
		&file.UpdatedAt, &file.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("file not found")
		}
		return nil, fmt.Errorf("failed to retrieve file: %w", err)
	}
	return file, nil
}

func (r *FileRepository) UpdateFile(file *models.UploadFile) error {
	query := `
		UPDATE files 
		SET name = $2, storage_key = $3, storage_url = $4, size_bytes = $5,
		    content_type = $6, duration = $7, file_hash = $8, upload_id = $9,
		    status = $10, updated_at = NOW()
		WHERE id = $1`

	_, err := r.db.Exec(query,
		file.ID, file.Name, file.StorageKey, file.StorageURL,
		file.SizeBytes, file.ContentType, file.Duration,
		file.FileHash, file.UploadID, file.Status,
	)
	if err != nil {
		return fmt.Errorf("failed to update file: %w", err)
	}
	return nil
}

func (r *FileRepository) UpdateFileStatus(id uuid.UUID, status string) error {
	query := `
		UPDATE files 
		SET status = $2, updated_at = NOW()
		WHERE id = $1`

	_, err := r.db.Exec(query, id, status)
	if err != nil {
		return fmt.Errorf("failed to update file status: %w", err)
	}
	return nil
}

func (r *FileRepository) DeleteFile(id uuid.UUID, userID string) error {
	query := `
		UPDATE files 
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2`

	_, err := r.db.Exec(query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

func (r *FileRepository) GetFilesByUserID(userID string, statuses []string) ([]*models.UploadFile, error) {
	query := `
		SELECT id, name, user_id, source_url, storage_key,
		       storage_url, size_bytes, content_type, duration, file_hash,
		       upload_id, status, created_at, updated_at, deleted_at
		FROM files 
		WHERE user_id = $1 AND deleted_at IS NULL`

	args := []interface{}{userID}

	if len(statuses) > 0 {
		query += ` AND status = ANY($2)`
		args = append(args, statuses)
	}

	query += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query files: %w", err)
	}
	defer rows.Close()

	var files []*models.UploadFile
	for rows.Next() {
		file := &models.UploadFile{}
		err := rows.Scan(
			&file.ID, &file.Name, &file.UserID,
			&file.SourceURL, &file.StorageKey, &file.StorageURL,
			&file.SizeBytes, &file.ContentType, &file.Duration,
			&file.FileHash, &file.UploadID, &file.Status, &file.CreatedAt,
			&file.UpdatedAt, &file.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan file row: %w", err)
		}
		files = append(files, file)
	}

	return files, nil
}

func (r *FileRepository) GetStaleUploads(olderThan time.Duration) ([]*models.UploadFile, error) {
	query := `
		SELECT id, name, user_id, source_url, storage_key,
		       storage_url, size_bytes, content_type, duration, file_hash,
		       upload_id, status, created_at, updated_at, deleted_at
		FROM files 
		WHERE status = 'uploading' 
		AND created_at < $1 
		AND deleted_at IS NULL`

	cutoff := time.Now().Add(-olderThan)
	rows, err := r.db.Query(query, cutoff)
	if err != nil {
		return nil, fmt.Errorf("failed to query stale uploads: %w", err)
	}
	defer rows.Close()

	var files []*models.UploadFile
	for rows.Next() {
		file := &models.UploadFile{}
		err := rows.Scan(
			&file.ID, &file.Name, &file.UserID,
			&file.SourceURL, &file.StorageKey, &file.StorageURL,
			&file.SizeBytes, &file.ContentType, &file.Duration,
			&file.FileHash, &file.UploadID, &file.Status, &file.CreatedAt,
			&file.UpdatedAt, &file.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan file row: %w", err)
		}
		files = append(files, file)
	}

	return files, nil
}
