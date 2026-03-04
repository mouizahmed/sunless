package repository

import (
	"database/sql"
	"fmt"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type ConversationRepository struct {
	db *database.DB
}

func NewConversationRepository(db *database.DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) Create(conv *models.Conversation) (*models.Conversation, error) {
	query := `
		INSERT INTO conversations (user_id, title)
		VALUES ($1, $2)
		RETURNING id, user_id, title, summary, summary_through_message_id, created_at, updated_at, deleted_at
	`

	var created models.Conversation
	var summaryThrough sql.NullString
	var deleted sql.NullTime
	err := r.db.QueryRow(query, conv.UserID, conv.Title).Scan(
		&created.ID,
		&created.UserID,
		&created.Title,
		&created.Summary,
		&summaryThrough,
		&created.CreatedAt,
		&created.UpdatedAt,
		&deleted,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	created.SummaryThroughMessageID = fromNullString(summaryThrough)
	created.DeletedAt = fromNullTime(deleted)
	return &created, nil
}

func (r *ConversationRepository) GetByID(userID, convID string) (*models.Conversation, error) {
	query := `
		SELECT id, user_id, title, summary, summary_through_message_id, created_at, updated_at, deleted_at
		FROM conversations
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	var conv models.Conversation
	var summaryThrough sql.NullString
	var deleted sql.NullTime
	err := r.db.QueryRow(query, convID, userID).Scan(
		&conv.ID,
		&conv.UserID,
		&conv.Title,
		&conv.Summary,
		&summaryThrough,
		&conv.CreatedAt,
		&conv.UpdatedAt,
		&deleted,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}

	conv.SummaryThroughMessageID = fromNullString(summaryThrough)
	conv.DeletedAt = fromNullTime(deleted)
	return &conv, nil
}

func (r *ConversationRepository) ListByUser(userID string, limit int) ([]models.Conversation, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, user_id, title, summary, summary_through_message_id, created_at, updated_at, deleted_at
		FROM conversations
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list conversations: %w", err)
	}
	defer rows.Close()

	conversations := []models.Conversation{}
	for rows.Next() {
		var conv models.Conversation
		var summaryThrough sql.NullString
		var deleted sql.NullTime
		if err := rows.Scan(
			&conv.ID,
			&conv.UserID,
			&conv.Title,
			&conv.Summary,
			&summaryThrough,
			&conv.CreatedAt,
			&conv.UpdatedAt,
			&deleted,
		); err != nil {
			return nil, fmt.Errorf("failed to scan conversation: %w", err)
		}
		conv.SummaryThroughMessageID = fromNullString(summaryThrough)
		conv.DeletedAt = fromNullTime(deleted)
		conversations = append(conversations, conv)
	}

	return conversations, rows.Err()
}

func (r *ConversationRepository) UpdateSummary(convID, summary string, throughMsgID string) error {
	query := `
		UPDATE conversations
		SET summary = $2, summary_through_message_id = $3, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(query, convID, summary, throughMsgID)
	if err != nil {
		return fmt.Errorf("failed to update summary: %w", err)
	}
	return nil
}

func (r *ConversationRepository) UpdateTitle(convID, title string) error {
	query := `
		UPDATE conversations
		SET title = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := r.db.Exec(query, convID, title)
	if err != nil {
		return fmt.Errorf("failed to update title: %w", err)
	}
	return nil
}

func (r *ConversationRepository) Delete(userID, convID string) (bool, error) {
	query := `
		UPDATE conversations
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	res, err := r.db.Exec(query, convID, userID)
	if err != nil {
		return false, fmt.Errorf("failed to delete conversation: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to delete conversation: %w", err)
	}
	return affected > 0, nil
}
