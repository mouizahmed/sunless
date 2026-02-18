package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type TranscriptRepository struct {
	db *database.DB
}

func NewTranscriptRepository(db *database.DB) *TranscriptRepository {
	return &TranscriptRepository{db: db}
}

func (r *TranscriptRepository) UpsertSpeaker(speaker *models.TranscriptSpeaker) (*models.TranscriptSpeaker, error) {
	query := `
		INSERT INTO transcript_speakers (note_id, user_id, speaker_key, channel, label, color)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (note_id, speaker_key, channel) DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color
		RETURNING id, note_id, user_id, speaker_key, channel, label, color, created_at
	`

	var result models.TranscriptSpeaker
	err := r.db.QueryRow(
		query,
		speaker.NoteID,
		speaker.UserID,
		speaker.SpeakerKey,
		speaker.Channel,
		speaker.Label,
		speaker.Color,
	).Scan(
		&result.ID,
		&result.NoteID,
		&result.UserID,
		&result.SpeakerKey,
		&result.Channel,
		&result.Label,
		&result.Color,
		&result.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert speaker: %w", err)
	}

	return &result, nil
}

func (r *TranscriptRepository) BatchInsertSegments(segments []*models.TranscriptSegment) error {
	if len(segments) == 0 {
		return nil
	}

	valueStrings := make([]string, 0, len(segments))
	args := make([]interface{}, 0, len(segments)*6)

	for i, seg := range segments {
		base := i * 6
		valueStrings = append(valueStrings, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d)",
			base+1, base+2, base+3, base+4, base+5, base+6,
		))
		args = append(args, seg.NoteID, seg.SpeakerID, seg.Text, seg.StartTime, seg.EndTime, seg.SegmentIndex)
	}

	query := fmt.Sprintf(
		`INSERT INTO transcript_segments (note_id, speaker_id, text, start_time, end_time, segment_index) VALUES %s`,
		strings.Join(valueStrings, ", "),
	)

	_, err := r.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to batch insert segments: %w", err)
	}

	return nil
}

func (r *TranscriptRepository) GetSpeakersByNote(noteID, userID string) ([]*models.TranscriptSpeaker, error) {
	query := `
		SELECT id, note_id, user_id, speaker_key, channel, label, color, created_at
		FROM transcript_speakers
		WHERE note_id = $1 AND user_id = $2
		ORDER BY speaker_key
	`

	rows, err := r.db.Query(query, noteID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get speakers: %w", err)
	}
	defer rows.Close()

	var speakers []*models.TranscriptSpeaker
	for rows.Next() {
		var s models.TranscriptSpeaker
		if err := rows.Scan(&s.ID, &s.NoteID, &s.UserID, &s.SpeakerKey, &s.Channel, &s.Label, &s.Color, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan speaker: %w", err)
		}
		speakers = append(speakers, &s)
	}

	return speakers, rows.Err()
}

func (r *TranscriptRepository) GetSegmentsByNote(noteID, userID string) ([]*models.TranscriptSegment, error) {
	query := `
		SELECT s.id, s.note_id, s.speaker_id, s.text, s.start_time, s.end_time, s.segment_index, s.created_at
		FROM transcript_segments s
		JOIN transcript_speakers sp ON sp.id = s.speaker_id
		WHERE s.note_id = $1 AND sp.user_id = $2
		ORDER BY s.segment_index
	`

	rows, err := r.db.Query(query, noteID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get segments: %w", err)
	}
	defer rows.Close()

	var segments []*models.TranscriptSegment
	for rows.Next() {
		var seg models.TranscriptSegment
		if err := rows.Scan(
			&seg.ID, &seg.NoteID, &seg.SpeakerID, &seg.Text,
			&seg.StartTime, &seg.EndTime, &seg.SegmentIndex, &seg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan segment: %w", err)
		}
		segments = append(segments, &seg)
	}

	return segments, rows.Err()
}

func (r *TranscriptRepository) UpdateSpeaker(speakerID, userID, label, color string) error {
	query := `
		UPDATE transcript_speakers
		SET label = CASE WHEN $3 = '' THEN label ELSE $3 END,
		    color = CASE WHEN $4 = '' THEN color ELSE $4 END
		WHERE id = $1 AND user_id = $2
	`

	res, err := r.db.Exec(query, speakerID, userID, label, color)
	if err != nil {
		return fmt.Errorf("failed to update speaker: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("speaker not found")
	}

	return nil
}

func (r *TranscriptRepository) SearchSegments(userID, query string, limit int) ([]*models.TranscriptSegment, error) {
	search := strings.TrimSpace(query)
	if search == "" {
		return []*models.TranscriptSegment{}, nil
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	sqlQuery := `
		SELECT s.id, s.note_id, s.speaker_id, s.text, s.start_time, s.end_time, s.segment_index, s.created_at
		FROM transcript_segments s
		JOIN transcript_speakers sp ON sp.id = s.speaker_id
		WHERE sp.user_id = $1
			AND to_tsvector('english', s.text) @@ plainto_tsquery('english', $2)
		ORDER BY s.created_at DESC
		LIMIT $3
	`

	rows, err := r.db.Query(sqlQuery, userID, search, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search segments: %w", err)
	}
	defer rows.Close()

	var segments []*models.TranscriptSegment
	for rows.Next() {
		var seg models.TranscriptSegment
		if err := rows.Scan(
			&seg.ID, &seg.NoteID, &seg.SpeakerID, &seg.Text,
			&seg.StartTime, &seg.EndTime, &seg.SegmentIndex, &seg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan search segment: %w", err)
		}
		segments = append(segments, &seg)
	}

	return segments, rows.Err()
}

func (r *TranscriptRepository) GetMaxSegmentIndex(noteID string) (int, error) {
	query := `
		SELECT COALESCE(MAX(segment_index), -1)
		FROM transcript_segments
		WHERE note_id = $1
	`

	var maxIndex int
	err := r.db.QueryRow(query, noteID).Scan(&maxIndex)
	if err != nil {
		if err == sql.ErrNoRows {
			return -1, nil
		}
		return -1, fmt.Errorf("failed to get max segment index: %w", err)
	}

	return maxIndex, nil
}
