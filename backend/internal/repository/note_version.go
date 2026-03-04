package repository

import (
	"fmt"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type NoteVersionRepository struct {
	db *database.DB
}

func NewNoteVersionRepository(db *database.DB) *NoteVersionRepository {
	return &NoteVersionRepository{db: db}
}

func (r *NoteVersionRepository) CreateVersion(noteID, noteMarkdown string) (*models.NoteVersion, error) {
	query := `
		INSERT INTO note_versions (note_id, note_markdown)
		VALUES ($1, $2)
		RETURNING id, note_id, note_markdown, created_at
	`

	var v models.NoteVersion
	err := r.db.QueryRow(query, noteID, noteMarkdown).Scan(
		&v.ID,
		&v.NoteID,
		&v.NoteMarkdown,
		&v.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create note version: %w", err)
	}
	return &v, nil
}

func (r *NoteVersionRepository) ListVersions(noteID string) ([]models.NoteVersion, error) {
	query := `
		SELECT id, note_id, note_markdown, created_at
		FROM note_versions
		WHERE note_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list note versions: %w", err)
	}
	defer rows.Close()

	versions := []models.NoteVersion{}
	for rows.Next() {
		var v models.NoteVersion
		if err := rows.Scan(&v.ID, &v.NoteID, &v.NoteMarkdown, &v.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan note version: %w", err)
		}
		versions = append(versions, v)
	}
	return versions, rows.Err()
}

func (r *NoteVersionRepository) GetVersion(versionID string) (*models.NoteVersion, error) {
	query := `
		SELECT id, note_id, note_markdown, created_at
		FROM note_versions
		WHERE id = $1
	`

	var v models.NoteVersion
	err := r.db.QueryRow(query, versionID).Scan(&v.ID, &v.NoteID, &v.NoteMarkdown, &v.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get note version: %w", err)
	}
	return &v, nil
}

func (r *NoteVersionRepository) DeleteVersion(versionID string) (bool, error) {
	query := `DELETE FROM note_versions WHERE id = $1`
	res, err := r.db.Exec(query, versionID)
	if err != nil {
		return false, fmt.Errorf("failed to delete note version: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to delete note version: %w", err)
	}
	return affected > 0, nil
}
