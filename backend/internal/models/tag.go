package models

import (
	"time"
)

type Tag struct {
	ID        string     `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	ItemID    string     `json:"item_id" db:"item_id"`
	ItemType  string     `json:"item_type" db:"item_type"`
	UserID    string     `json:"user_id" db:"user_id"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

type CreateTagRequest struct {
	Name     string `json:"name" binding:"required"`
	ItemID   string `json:"item_id" binding:"required"`
	ItemType string `json:"item_type" binding:"required"`
}

type UpdateTagRequest struct {
	Name string `json:"name" binding:"required"`
}

type UpdateItemTagsRequest struct {
	Tags []string `json:"tags" binding:"required"`
}