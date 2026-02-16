package repository

import (
	"database/sql"
	"fmt"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type NoteAttachmentRepository struct {
	db *database.DB
}

func NewNoteAttachmentRepository(db *database.DB) *NoteAttachmentRepository {
	return &NoteAttachmentRepository{db: db}
}

func (r *NoteAttachmentRepository) CreateAttachment(att *models.NoteAttachment) (*models.NoteAttachment, error) {
	query := `
		INSERT INTO note_attachments (note_id, user_id, file_name, mime_type, size_bytes, b2_file_id, b2_file_name, public_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, note_id, user_id, file_name, mime_type, size_bytes, b2_file_id, b2_file_name, public_url, created_at, updated_at, deleted_at
	`

	var created models.NoteAttachment
	var deleted sql.NullTime
	err := r.db.QueryRow(
		query,
		att.NoteID,
		att.UserID,
		att.FileName,
		att.MimeType,
		att.SizeBytes,
		att.B2FileID,
		att.B2FileName,
		att.PublicURL,
	).Scan(
		&created.ID,
		&created.NoteID,
		&created.UserID,
		&created.FileName,
		&created.MimeType,
		&created.SizeBytes,
		&created.B2FileID,
		&created.B2FileName,
		&created.PublicURL,
		&created.CreatedAt,
		&created.UpdatedAt,
		&deleted,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create note attachment: %w", err)
	}

	created.DeletedAt = fromNullTime(deleted)
	return &created, nil
}

func (r *NoteAttachmentRepository) ListByNoteID(userID, noteID string) ([]models.NoteAttachment, error) {
	query := `
		SELECT id, note_id, user_id, file_name, mime_type, size_bytes, b2_file_id, b2_file_name, public_url, created_at, updated_at, deleted_at
		FROM note_attachments
		WHERE note_id = $1 AND user_id = $2 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, noteID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list note attachments: %w", err)
	}
	defer rows.Close()

	attachments := []models.NoteAttachment{}
	for rows.Next() {
		var att models.NoteAttachment
		var deleted sql.NullTime
		if err := rows.Scan(
			&att.ID,
			&att.NoteID,
			&att.UserID,
			&att.FileName,
			&att.MimeType,
			&att.SizeBytes,
			&att.B2FileID,
			&att.B2FileName,
			&att.PublicURL,
			&att.CreatedAt,
			&att.UpdatedAt,
			&deleted,
		); err != nil {
			return nil, fmt.Errorf("failed to scan note attachment: %w", err)
		}
		att.DeletedAt = fromNullTime(deleted)
		attachments = append(attachments, att)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to list note attachments: %w", err)
	}

	return attachments, nil
}

func (r *NoteAttachmentRepository) GetByID(userID, attachmentID string) (*models.NoteAttachment, error) {
	query := `
		SELECT id, note_id, user_id, file_name, mime_type, size_bytes, b2_file_id, b2_file_name, public_url, created_at, updated_at, deleted_at
		FROM note_attachments
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
		LIMIT 1
	`

	var att models.NoteAttachment
	var deleted sql.NullTime
	err := r.db.QueryRow(query, attachmentID, userID).Scan(
		&att.ID,
		&att.NoteID,
		&att.UserID,
		&att.FileName,
		&att.MimeType,
		&att.SizeBytes,
		&att.B2FileID,
		&att.B2FileName,
		&att.PublicURL,
		&att.CreatedAt,
		&att.UpdatedAt,
		&deleted,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("attachment not found")
		}
		return nil, fmt.Errorf("failed to get note attachment: %w", err)
	}

	att.DeletedAt = fromNullTime(deleted)
	return &att, nil
}

func (r *NoteAttachmentRepository) DeleteAttachment(userID, attachmentID string) (bool, error) {
	query := `
		UPDATE note_attachments
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	res, err := r.db.Exec(query, attachmentID, userID)
	if err != nil {
		return false, fmt.Errorf("failed to delete note attachment: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to delete note attachment: %w", err)
	}

	return affected > 0, nil
}
