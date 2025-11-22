package models

import "time"

type Glossary struct {
	ID        string     `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	UserID    string     `json:"user_id" db:"user_id"`
	ItemCount int        `json:"item_count" db:"item_count"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type GlossaryItem struct {
	ID          string     `json:"id" db:"id"`
	GlossaryID  string     `json:"glossary_id" db:"glossary_id"`
	Word        string     `json:"word" db:"word"`
	Intensifier int        `json:"intensifier" db:"intensifier"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type CreateGlossaryRequest struct {
	Name string `json:"name" binding:"required"`
}

type CreateGlossaryItemRequest struct {
	Word        string `json:"word" binding:"required"`
	Intensifier int    `json:"intensifier"`
}

type UpdateGlossaryItemRequest struct {
	Word        *string `json:"word"`
	Intensifier *int    `json:"intensifier"`
}

type UpdateGlossaryRequest struct {
	Name string `json:"name" binding:"required"`
}
