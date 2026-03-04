package repository

import (
	"database/sql"
	"fmt"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type MessageRepository struct {
	db *database.DB
}

func NewMessageRepository(db *database.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

const messageColumns = `id, conversation_id, role, content, tool_calls, tool_call_id, thinking, thinking_duration, token_count, created_at`

func scanMessage(scanner interface{ Scan(...any) error }) (models.Message, error) {
	var msg models.Message
	var toolCalls sql.NullString
	var toolCallID sql.NullString
	err := scanner.Scan(
		&msg.ID,
		&msg.ConversationID,
		&msg.Role,
		&msg.Content,
		&toolCalls,
		&toolCallID,
		&msg.Thinking,
		&msg.ThinkingDuration,
		&msg.TokenCount,
		&msg.CreatedAt,
	)
	if err != nil {
		return msg, err
	}
	msg.ToolCalls = fromNullString(toolCalls)
	msg.ToolCallID = fromNullString(toolCallID)
	return msg, nil
}

func (r *MessageRepository) Create(msg *models.Message) (*models.Message, error) {
	query := fmt.Sprintf(`
		INSERT INTO messages (conversation_id, role, content, tool_calls, tool_call_id, thinking, thinking_duration, token_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING %s
	`, messageColumns)

	row := r.db.QueryRow(
		query,
		msg.ConversationID,
		msg.Role,
		msg.Content,
		toNullString(msg.ToolCalls),
		toNullString(msg.ToolCallID),
		msg.Thinking,
		msg.ThinkingDuration,
		msg.TokenCount,
	)

	created, err := scanMessage(row)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}
	return &created, nil
}

func (r *MessageRepository) ListByConversation(convID string) ([]models.Message, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC
	`, messageColumns)

	rows, err := r.db.Query(query, convID)
	if err != nil {
		return nil, fmt.Errorf("failed to list messages: %w", err)
	}
	defer rows.Close()

	messages := []models.Message{}
	for rows.Next() {
		msg, err := scanMessage(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}

func (r *MessageRepository) GetTokenSum(convID string) (int, error) {
	query := `SELECT COALESCE(SUM(token_count), 0) FROM messages WHERE conversation_id = $1`
	var total int
	err := r.db.QueryRow(query, convID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to get token sum: %w", err)
	}
	return total, nil
}

func (r *MessageRepository) GetMessagesAfter(convID, afterMsgID string) ([]models.Message, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM messages
		WHERE conversation_id = $1 AND created_at > (
			SELECT created_at FROM messages WHERE id = $2
		)
		ORDER BY created_at ASC
	`, messageColumns)

	rows, err := r.db.Query(query, convID, afterMsgID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages after: %w", err)
	}
	defer rows.Close()

	messages := []models.Message{}
	for rows.Next() {
		msg, err := scanMessage(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan message: %w", err)
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}
