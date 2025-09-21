package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/utils"
)

type OAuthTokenRepository interface {
	Create(token *models.OAuthToken) error
	GetByUserAndProvider(userID, provider string) (*models.OAuthToken, error)
	Update(userID, provider string, updates *models.UpdateOAuthTokenRequest) error
	Delete(userID, provider string) error
	GetByUser(userID string) ([]*models.OAuthToken, error)
}

type oauthTokenRepository struct {
	db *database.DB
}

func NewOAuthTokenRepository(db *database.DB) OAuthTokenRepository {
	return &oauthTokenRepository{db: db}
}

func (r *oauthTokenRepository) Create(token *models.OAuthToken) error {
	encryptedAccessToken, err := utils.EncryptToken(token.AccessToken)
	if err != nil {
		return err
	}

	var encryptedRefreshToken *string
	if token.RefreshToken != nil {
		encrypted, err := utils.EncryptToken(*token.RefreshToken)
		if err != nil {
			return err
		}
		encryptedRefreshToken = &encrypted
	}

	now := time.Now()
	token.CreatedAt = now
	token.UpdatedAt = now

	query := `
		INSERT INTO user_oauth_tokens (user_id, provider, access_token, refresh_token, expires_at, scopes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, provider)
		DO UPDATE SET
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			expires_at = EXCLUDED.expires_at,
			scopes = EXCLUDED.scopes,
			updated_at = EXCLUDED.updated_at
	`

	_, err = r.db.Exec(query, token.UserID, token.Provider, encryptedAccessToken, encryptedRefreshToken, token.ExpiresAt, token.Scopes, token.CreatedAt, token.UpdatedAt)
	return err
}

func (r *oauthTokenRepository) GetByUserAndProvider(userID, provider string) (*models.OAuthToken, error) {
	query := `
		SELECT user_id, provider, access_token, refresh_token, expires_at, scopes, created_at, updated_at
		FROM user_oauth_tokens
		WHERE user_id = $1 AND provider = $2
	`

	var token models.OAuthToken
	var encryptedAccessToken string
	var encryptedRefreshToken *string

	err := r.db.QueryRow(query, userID, provider).Scan(
		&token.UserID,
		&token.Provider,
		&encryptedAccessToken,
		&encryptedRefreshToken,
		&token.ExpiresAt,
		&token.Scopes,
		&token.CreatedAt,
		&token.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	decryptedAccessToken, err := utils.DecryptToken(encryptedAccessToken)
	if err != nil {
		return nil, err
	}
	token.AccessToken = decryptedAccessToken

	if encryptedRefreshToken != nil {
		decryptedRefreshToken, err := utils.DecryptToken(*encryptedRefreshToken)
		if err != nil {
			return nil, err
		}
		token.RefreshToken = &decryptedRefreshToken
	}

	return &token, nil
}

func (r *oauthTokenRepository) Update(userID, provider string, updates *models.UpdateOAuthTokenRequest) error {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.AccessToken != nil {
		encryptedAccessToken, err := utils.EncryptToken(*updates.AccessToken)
		if err != nil {
			return err
		}
		setParts = append(setParts, fmt.Sprintf("access_token = $%d", argIndex))
		args = append(args, encryptedAccessToken)
		argIndex++
	}

	if updates.RefreshToken != nil {
		encryptedRefreshToken, err := utils.EncryptToken(*updates.RefreshToken)
		if err != nil {
			return err
		}
		setParts = append(setParts, fmt.Sprintf("refresh_token = $%d", argIndex))
		args = append(args, encryptedRefreshToken)
		argIndex++
	}

	if updates.ExpiresAt != nil {
		setParts = append(setParts, fmt.Sprintf("expires_at = $%d", argIndex))
		args = append(args, *updates.ExpiresAt)
		argIndex++
	}

	if updates.Scopes != nil {
		setParts = append(setParts, fmt.Sprintf("scopes = $%d", argIndex))
		args = append(args, *updates.Scopes)
		argIndex++
	}

	if len(setParts) == 0 {
		return nil
	}

	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	args = append(args, userID, provider)

	query := "UPDATE user_oauth_tokens SET " + strings.Join(setParts, ", ") +
		fmt.Sprintf(" WHERE user_id = $%d AND provider = $%d", argIndex, argIndex+1)

	_, err := r.db.Exec(query, args...)
	return err
}

func (r *oauthTokenRepository) Delete(userID, provider string) error {
	query := `DELETE FROM user_oauth_tokens WHERE user_id = $1 AND provider = $2`
	_, err := r.db.Exec(query, userID, provider)
	return err
}

func (r *oauthTokenRepository) GetByUser(userID string) ([]*models.OAuthToken, error) {
	query := `
		SELECT user_id, provider, access_token, refresh_token, expires_at, scopes, created_at, updated_at
		FROM user_oauth_tokens
		WHERE user_id = $1
		ORDER BY provider
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*models.OAuthToken
	for rows.Next() {
		var token models.OAuthToken
		var encryptedAccessToken string
		var encryptedRefreshToken *string

		err := rows.Scan(
			&token.UserID,
			&token.Provider,
			&encryptedAccessToken,
			&encryptedRefreshToken,
			&token.ExpiresAt,
			&token.Scopes,
			&token.CreatedAt,
			&token.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		decryptedAccessToken, err := utils.DecryptToken(encryptedAccessToken)
		if err != nil {
			return nil, err
		}
		token.AccessToken = decryptedAccessToken

		if encryptedRefreshToken != nil {
			decryptedRefreshToken, err := utils.DecryptToken(*encryptedRefreshToken)
			if err != nil {
				return nil, err
			}
			token.RefreshToken = &decryptedRefreshToken
		}

		tokens = append(tokens, &token)
	}

	return tokens, rows.Err()
}