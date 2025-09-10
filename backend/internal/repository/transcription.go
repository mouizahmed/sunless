package repository

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type TranscriptionRepository struct {
	db *database.DB
}

func NewTranscriptionRepository(db *database.DB) *TranscriptionRepository {
	return &TranscriptionRepository{db: db}
}

func (r *TranscriptionRepository) Create(transcription *models.Transcription) error {
	query := `
		INSERT INTO transcriptions (
			id, user_id, file_id, glossary_id, language_code, 
			status, model, settings, job_id, error_message,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
			CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
		)
		RETURNING created_at, updated_at`

	err := r.db.QueryRow(
		query,
		transcription.ID,
		transcription.UserID,
		transcription.FileID,
		transcription.GlossaryID,
		transcription.LanguageCode,
		transcription.Status,
		transcription.Model,
		transcription.Settings,
		transcription.JobID,
		transcription.ErrorMessage,
	).Scan(&transcription.CreatedAt, &transcription.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create transcription: %w", err)
	}

	return nil
}

func (r *TranscriptionRepository) GetByID(id uuid.UUID) (*models.Transcription, error) {
	transcription := &models.Transcription{}
	query := `
		SELECT id, user_id, file_id, glossary_id, language_code,
			   status, model, settings, job_id, error_message,
			   created_at, updated_at, deleted_at
		FROM transcriptions 
		WHERE id = $1 AND deleted_at IS NULL`

	err := r.db.QueryRow(query, id).Scan(
		&transcription.ID,
		&transcription.UserID,
		&transcription.FileID,
		&transcription.GlossaryID,
		&transcription.LanguageCode,
		&transcription.Status,
		&transcription.Model,
		&transcription.Settings,
		&transcription.JobID,
		&transcription.ErrorMessage,
		&transcription.CreatedAt,
		&transcription.UpdatedAt,
		&transcription.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("transcription not found")
		}
		return nil, fmt.Errorf("failed to get transcription: %w", err)
	}

	return transcription, nil
}

func (r *TranscriptionRepository) GetByUserID(userID string) ([]*models.Transcription, error) {
	query := `
		SELECT id, user_id, file_id, glossary_id, language_code,
			   status, model, settings, job_id, error_message,
			   created_at, updated_at, deleted_at
		FROM transcriptions 
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transcriptions: %w", err)
	}
	defer rows.Close()

	var transcriptions []*models.Transcription
	for rows.Next() {
		transcription := &models.Transcription{}
		err := rows.Scan(
			&transcription.ID,
			&transcription.UserID,
			&transcription.FileID,
			&transcription.GlossaryID,
			&transcription.LanguageCode,
			&transcription.Status,
			&transcription.Model,
			&transcription.Settings,
			&transcription.JobID,
			&transcription.ErrorMessage,
			&transcription.CreatedAt,
			&transcription.UpdatedAt,
			&transcription.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan transcription: %w", err)
		}
		transcriptions = append(transcriptions, transcription)
	}

	return transcriptions, nil
}

func (r *TranscriptionRepository) UpdateStatus(id uuid.UUID, status string, jobID *string, errorMessage *string) error {
	query := `
		UPDATE transcriptions 
		SET status = $2, job_id = $3, error_message = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1`

	_, err := r.db.Exec(query, id, status, jobID, errorMessage)
	if err != nil {
		return fmt.Errorf("failed to update transcription status: %w", err)
	}

	return nil
}

func (r *TranscriptionRepository) Delete(id uuid.UUID) error {
	query := `
		UPDATE transcriptions 
		SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1`

	_, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete transcription: %w", err)
	}

	return nil
}

func (r *TranscriptionRepository) BatchCreate(transcriptions []*models.Transcription) error {
	if len(transcriptions) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO transcriptions (
			id, user_id, file_id, glossary_id, language_code,
			status, model, settings, job_id, error_message,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
		)
		RETURNING created_at, updated_at`

	for _, transcription := range transcriptions {
		err := tx.QueryRow(
			query,
			transcription.ID,
			transcription.UserID,
			transcription.FileID,
			transcription.GlossaryID,
			transcription.LanguageCode,
			transcription.Status,
			transcription.Model,
			transcription.Settings,
			transcription.JobID,
			transcription.ErrorMessage,
		).Scan(&transcription.CreatedAt, &transcription.UpdatedAt)

		if err != nil {
			return fmt.Errorf("failed to create transcription in batch: %w", err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transcription batch: %w", err)
	}

	return nil
}