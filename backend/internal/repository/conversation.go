package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type ConversationRepository struct {
	db *database.DB
}

func NewConversationRepository(db *database.DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

type ConversationSessionSummary struct {
	Session            models.ConversationSession
	LastMessageSender  *string
	LastMessageContent *string
	LastMessageAt      *time.Time
	MessageCount       int
}

func (r *ConversationRepository) CreateSession(session *models.ConversationSession) (*models.ConversationSession, error) {
	if session.ID == "" {
		session.ID = uuid.New().String()
	}

	now := time.Now()
	session.CreatedAt = now
	session.UpdatedAt = now

	query := `
		INSERT INTO conversation_sessions (
			id, user_id, chat_model_provider, chat_model_name, live_model_provider, live_model_name, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.Exec(query,
		session.ID,
		session.UserID,
		session.ChatModelProvider,
		session.ChatModelName,
		session.LiveModelProvider,
		session.LiveModelName,
		session.CreatedAt,
		session.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation session: %w", err)
	}

	return session, nil
}

func (r *ConversationRepository) GetSessionByID(id string) (*models.ConversationSession, error) {
	query := `
		SELECT id, user_id, chat_model_provider, chat_model_name, live_model_provider, live_model_name, created_at, updated_at, deleted_at
		FROM conversation_sessions
		WHERE id = $1 AND deleted_at IS NULL
	`

	session := &models.ConversationSession{}
	err := r.db.QueryRow(query, id).Scan(
		&session.ID,
		&session.UserID,
		&session.ChatModelProvider,
		&session.ChatModelName,
		&session.LiveModelProvider,
		&session.LiveModelName,
		&session.CreatedAt,
		&session.UpdatedAt,
		&session.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("conversation session not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation session: %w", err)
	}

	return session, nil
}

func (r *ConversationRepository) CreateMessage(message *models.ConversationMessage) (*models.ConversationMessage, error) {
	if message.ID == "" {
		message.ID = uuid.New().String()
	}

	now := time.Now()
	message.CreatedAt = now
	message.UpdatedAt = now

	if message.Metadata != nil {
		var metadata interface{}
		if err := json.Unmarshal(*message.Metadata, &metadata); err != nil {
			return nil, fmt.Errorf("invalid metadata: %w", err)
		}
	}

	query := `
		INSERT INTO conversation_messages (
			id, session_id, channel, sender, content, token_count, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.db.Exec(query,
		message.ID,
		message.SessionID,
		message.Channel,
		message.Sender,
		message.Content,
		message.TokenCount,
		message.Metadata,
		message.CreatedAt,
		message.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation message: %w", err)
	}

	return message, nil
}

func (r *ConversationRepository) CreateAttachment(attachment *models.ConversationAttachment) (*models.ConversationAttachment, error) {
	if attachment.ID == "" {
		attachment.ID = uuid.New().String()
	}

	now := time.Now()
	attachment.CreatedAt = now
	attachment.UpdatedAt = now

	query := `
		INSERT INTO conversation_attachments (
			id, session_id, message_id, uploaded_by,
			file_name, mime_type, size_bytes, sha256_hash,
			b2_bucket_id, b2_file_id, b2_file_name, public_url,
			source, status, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`

	_, err := r.db.Exec(query,
		attachment.ID,
		attachment.SessionID,
		attachment.MessageID,
		attachment.UploadedBy,
		attachment.FileName,
		attachment.MimeType,
		attachment.SizeBytes,
		attachment.SHA256Hash,
		attachment.B2BucketID,
		attachment.B2FileID,
		attachment.B2FileName,
		attachment.PublicURL,
		attachment.Source,
		attachment.Status,
		attachment.Metadata,
		attachment.CreatedAt,
		attachment.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create conversation attachment: %w", err)
	}

	return attachment, nil
}

func (r *ConversationRepository) UpdateAttachmentsMessage(messageID string, attachmentIDs []string) error {
	if len(attachmentIDs) == 0 {
		return nil
	}

	query := `
		UPDATE conversation_attachments
		SET message_id = $1, updated_at = $3
		WHERE id = ANY($2)
	`

	_, err := r.db.Exec(query, messageID, pq.Array(attachmentIDs), time.Now())
	if err != nil {
		return fmt.Errorf("failed to update conversation attachments message: %w", err)
	}

	return nil
}

func (r *ConversationRepository) ListSessionsByUser(userID string, limit, offset int) ([]ConversationSessionSummary, error) {
	if limit <= 0 {
		limit = 20
	}

	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT
			s.id,
			s.user_id,
			s.chat_model_provider,
			s.chat_model_name,
			s.live_model_provider,
			s.live_model_name,
			s.created_at,
			s.updated_at,
			s.deleted_at,
			lm.content AS last_message_content,
			lm.sender AS last_message_sender,
			lm.created_at AS last_message_created_at,
			COALESCE(mc.message_count, 0) AS message_count
		FROM conversation_sessions s
		LEFT JOIN LATERAL (
			SELECT m.content, m.sender, m.created_at
			FROM conversation_messages m
			WHERE m.session_id = s.id AND m.deleted_at IS NULL
			ORDER BY m.created_at DESC
			LIMIT 1
		) lm ON true
		LEFT JOIN (
			SELECT session_id, COUNT(*) AS message_count
			FROM conversation_messages
			WHERE deleted_at IS NULL
			GROUP BY session_id
		) mc ON mc.session_id = s.id
		WHERE s.user_id = $1 AND s.deleted_at IS NULL
		ORDER BY COALESCE(lm.created_at, s.created_at) DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list conversation sessions: %w", err)
	}
	defer rows.Close()

	summaries := []ConversationSessionSummary{}

	for rows.Next() {
		var summary ConversationSessionSummary
		var session models.ConversationSession
		var lastMessageContent sql.NullString
		var lastMessageSender sql.NullString
		var lastMessageCreatedAt sql.NullTime
		var deletedAt sql.NullTime
		var liveModelProvider sql.NullString
		var liveModelName sql.NullString

		err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.ChatModelProvider,
			&session.ChatModelName,
			&liveModelProvider,
			&liveModelName,
			&session.CreatedAt,
			&session.UpdatedAt,
			&deletedAt,
			&lastMessageContent,
			&lastMessageSender,
			&lastMessageCreatedAt,
			&summary.MessageCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conversation session summary: %w", err)
		}

		if deletedAt.Valid {
			session.DeletedAt = &deletedAt.Time
		}

		if liveModelProvider.Valid {
			value := liveModelProvider.String
			session.LiveModelProvider = &value
		} else {
			session.LiveModelProvider = nil
		}

		if liveModelName.Valid {
			value := liveModelName.String
			session.LiveModelName = &value
		} else {
			session.LiveModelName = nil
		}

		if lastMessageContent.Valid {
			value := lastMessageContent.String
			summary.LastMessageContent = &value
		}

		if lastMessageSender.Valid {
			value := lastMessageSender.String
			summary.LastMessageSender = &value
		}

		if lastMessageCreatedAt.Valid {
			value := lastMessageCreatedAt.Time
			summary.LastMessageAt = &value
		}

		summary.Session = session
		summaries = append(summaries, summary)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate conversation sessions: %w", err)
	}

	return summaries, nil
}

func (r *ConversationRepository) CountSessionsByUser(userID string) (int, error) {
	query := `
        SELECT COUNT(*)
        FROM conversation_sessions
        WHERE user_id = $1 AND deleted_at IS NULL
    `

	var total int
	if err := r.db.QueryRow(query, userID).Scan(&total); err != nil {
		return 0, fmt.Errorf("failed to count conversation sessions: %w", err)
	}

	return total, nil
}

func (r *ConversationRepository) ListAttachmentsByMessageIDs(messageIDs []string) (map[string][]models.ConversationAttachment, error) {
	result := make(map[string][]models.ConversationAttachment)
	if len(messageIDs) == 0 {
		return result, nil
	}

	query := `
		SELECT id, session_id, message_id, uploaded_by, file_name, mime_type, size_bytes, sha256_hash,
			   b2_bucket_id, b2_file_id, b2_file_name, public_url, source, status, metadata,
			   created_at, updated_at, deleted_at
		FROM conversation_attachments
		WHERE message_id = ANY($1) AND deleted_at IS NULL
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query, pq.Array(messageIDs))
	if err != nil {
		return nil, fmt.Errorf("failed to list conversation attachments: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var attachment models.ConversationAttachment
		err := rows.Scan(
			&attachment.ID,
			&attachment.SessionID,
			&attachment.MessageID,
			&attachment.UploadedBy,
			&attachment.FileName,
			&attachment.MimeType,
			&attachment.SizeBytes,
			&attachment.SHA256Hash,
			&attachment.B2BucketID,
			&attachment.B2FileID,
			&attachment.B2FileName,
			&attachment.PublicURL,
			&attachment.Source,
			&attachment.Status,
			&attachment.Metadata,
			&attachment.CreatedAt,
			&attachment.UpdatedAt,
			&attachment.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conversation attachment: %w", err)
		}

		if attachment.MessageID == nil {
			continue
		}
		messageID := *attachment.MessageID
		result[messageID] = append(result[messageID], attachment)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate conversation attachments: %w", err)
	}

	return result, nil
}

func (r *ConversationRepository) ListMessagesBySession(sessionID string) ([]models.ConversationMessage, error) {
	query := `
		SELECT id, session_id, channel, sender, content, token_count, metadata, created_at, updated_at, deleted_at
		FROM conversation_messages
		WHERE session_id = $1 AND deleted_at IS NULL
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to list conversation messages: %w", err)
	}
	defer rows.Close()

	messages := []models.ConversationMessage{}
	for rows.Next() {
		var msg models.ConversationMessage
		err := rows.Scan(
			&msg.ID,
			&msg.SessionID,
			&msg.Channel,
			&msg.Sender,
			&msg.Content,
			&msg.TokenCount,
			&msg.Metadata,
			&msg.CreatedAt,
			&msg.UpdatedAt,
			&msg.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conversation message: %w", err)
		}
		messages = append(messages, msg)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate conversation messages: %w", err)
	}

	return messages, nil
}
