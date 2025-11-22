package models

import (
	"time"
)

type OAuthToken struct {
	UserID       string     `db:"user_id" json:"user_id"`
	Provider     string     `db:"provider" json:"provider"`
	AccessToken  string     `db:"access_token" json:"-"`
	RefreshToken *string    `db:"refresh_token" json:"-"`
	ExpiresAt    *time.Time `db:"expires_at" json:"expires_at"`
	Scopes       *string    `db:"scopes" json:"scopes"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`
}

type CreateOAuthTokenRequest struct {
	UserID       string     `json:"user_id" validate:"required"`
	Provider     string     `json:"provider" validate:"required,oneof=google"`
	AccessToken  string     `json:"access_token" validate:"required"`
	RefreshToken *string    `json:"refresh_token"`
	ExpiresAt    *time.Time `json:"expires_at"`
	Scopes       *string    `json:"scopes"`
}

type UpdateOAuthTokenRequest struct {
	AccessToken  *string    `json:"access_token"`
	RefreshToken *string    `json:"refresh_token"`
	ExpiresAt    *time.Time `json:"expires_at"`
	Scopes       *string    `json:"scopes"`
}
