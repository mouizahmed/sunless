package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type MemoryRepository struct {
	db *database.DB
}

func NewMemoryRepository(db *database.DB) *MemoryRepository {
	return &MemoryRepository{db: db}
}

func (r *MemoryRepository) CreateMemory(memory *models.Memory) (*models.Memory, error) {
	if memory.ID == "" {
		memory.ID = uuid.New().String()
	}
	if memory.Importance == 0 {
		memory.Importance = 1
	}

	now := time.Now()
	memory.CreatedAt = now
	memory.UpdatedAt = now

	query := `
		INSERT INTO memories (
			id, user_id, session_id, start_message_id, end_message_id,
		 summary, importance, vector_id, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Exec(query,
		memory.ID,
		memory.UserID,
		memory.SessionID,
		memory.StartMessageID,
		memory.EndMessageID,
		memory.Summary,
		memory.Importance,
		memory.VectorID,
		memory.CreatedAt,
		memory.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert memory: %w", err)
	}

	return memory, nil
}

func (r *MemoryRepository) UpdateMemoryVectorID(memoryID, vectorID string) error {
	query := `
		UPDATE memories
		SET vector_id = $2, updated_at = NOW()
		WHERE id = $1
	`
	if _, err := r.db.Exec(query, memoryID, vectorID); err != nil {
		return fmt.Errorf("failed to update memory vector id: %w", err)
	}
	return nil
}

func (r *MemoryRepository) GetLatestMemoryForSession(sessionID string) (*models.Memory, error) {
	query := `
		SELECT id, user_id, session_id, start_message_id, end_message_id,
		       summary, importance, vector_id, created_at, updated_at, deleted_at
		FROM memories
		WHERE session_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`

	var mem models.Memory
	var sessionIDPtr sql.NullString
	var startMsgID, endMsgID sql.NullString
	var vectorID sql.NullString
	var deletedAt sql.NullTime

	err := r.db.QueryRow(query, sessionID).Scan(
		&mem.ID,
		&mem.UserID,
		&sessionIDPtr,
		&startMsgID,
		&endMsgID,
		&mem.Summary,
		&mem.Importance,
		&vectorID,
		&mem.CreatedAt,
		&mem.UpdatedAt,
		&deletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to fetch latest memory: %w", err)
	}

	if sessionIDPtr.Valid {
		mem.SessionID = &sessionIDPtr.String
	}
	if startMsgID.Valid {
		mem.StartMessageID = &startMsgID.String
	}
	if endMsgID.Valid {
		mem.EndMessageID = &endMsgID.String
	}
	if vectorID.Valid {
		mem.VectorID = &vectorID.String
	}
	if deletedAt.Valid {
		mem.DeletedAt = &deletedAt.Time
	}

	return &mem, nil
}

func (r *MemoryRepository) GetMemoriesByIDs(ids []string) (map[string]models.Memory, error) {
	result := make(map[string]models.Memory)
	if len(ids) == 0 {
		return result, nil
	}

	query := `
		SELECT id, user_id, session_id, start_message_id, end_message_id,
		       summary, importance, vector_id, created_at, updated_at, deleted_at
		FROM memories
		WHERE id = ANY($1) AND deleted_at IS NULL
	`

	rows, err := r.db.Query(query, pq.Array(ids))
	if err != nil {
		return nil, fmt.Errorf("failed to load memories: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var mem models.Memory
		var sessionID sql.NullString
		var startMsgID, endMsgID sql.NullString
		var vectorID sql.NullString
		var deletedAt sql.NullTime

		if err := rows.Scan(
			&mem.ID,
			&mem.UserID,
			&sessionID,
			&startMsgID,
			&endMsgID,
			&mem.Summary,
			&mem.Importance,
			&vectorID,
			&mem.CreatedAt,
			&mem.UpdatedAt,
			&deletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan memory: %w", err)
		}

		if sessionID.Valid {
			mem.SessionID = &sessionID.String
		}
		if startMsgID.Valid {
			mem.StartMessageID = &startMsgID.String
		}
		if endMsgID.Valid {
			mem.EndMessageID = &endMsgID.String
		}
		if vectorID.Valid {
			mem.VectorID = &vectorID.String
		}
		if deletedAt.Valid {
			mem.DeletedAt = &deletedAt.Time
		}

		result[mem.ID] = mem
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate memories: %w", err)
	}

	return result, nil
}

