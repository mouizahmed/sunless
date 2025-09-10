package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type TagRepository struct {
	db *sql.DB
}

func NewTagRepository(db *sql.DB) *TagRepository {
	return &TagRepository{db: db}
}

// Get all tags for a specific item
func (r *TagRepository) GetTagsForItem(itemID, itemType, userID string) ([]models.Tag, error) {
	query := `
		SELECT id, name, item_id, item_type, user_id, created_at, updated_at, deleted_at
		FROM tags
		WHERE item_id = $1 AND item_type = $2 AND user_id = $3 AND deleted_at IS NULL
		ORDER BY name ASC
	`
	
	rows, err := r.db.Query(query, itemID, itemType, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var tags []models.Tag
	for rows.Next() {
		var tag models.Tag
		err := rows.Scan(&tag.ID, &tag.Name, &tag.ItemID, &tag.ItemType, &tag.UserID, &tag.CreatedAt, &tag.UpdatedAt, &tag.DeletedAt)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	
	return tags, nil
}

// Create a new tag
func (r *TagRepository) CreateTag(name, itemID, itemType, userID string) (*models.Tag, error) {
	// Check if tag already exists for this item (prevent duplicates)
	existingTag, err := r.getTagByNameAndItem(name, itemID, itemType, userID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if existingTag != nil {
		return existingTag, nil // Return existing tag
	}
	
	query := `
		INSERT INTO tags (name, item_id, item_type, user_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, item_id, item_type, user_id, created_at, updated_at, deleted_at
	`
	
	now := time.Now()
	var tag models.Tag
	err = r.db.QueryRow(query, name, itemID, itemType, userID, now, now).Scan(
		&tag.ID, &tag.Name, &tag.ItemID, &tag.ItemType, &tag.UserID, &tag.CreatedAt, &tag.UpdatedAt, &tag.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	
	return &tag, nil
}

// Update a tag
func (r *TagRepository) UpdateTag(tagID, name, userID string) (*models.Tag, error) {
	query := `
		UPDATE tags
		SET name = $1, updated_at = $2
		WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
		RETURNING id, name, item_id, item_type, user_id, created_at, updated_at, deleted_at
	`
	
	var tag models.Tag
	err := r.db.QueryRow(query, name, time.Now(), tagID, userID).Scan(
		&tag.ID, &tag.Name, &tag.ItemID, &tag.ItemType, &tag.UserID, &tag.CreatedAt, &tag.UpdatedAt, &tag.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("tag not found or you don't have access to it")
		}
		return nil, err
	}
	
	return &tag, nil
}

// Soft delete a tag
func (r *TagRepository) DeleteTag(tagID, userID string) error {
	query := `
		UPDATE tags
		SET deleted_at = $1, updated_at = $2
		WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
	`
	
	result, err := r.db.Exec(query, time.Now(), time.Now(), tagID, userID)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("tag not found or you don't have access to it")
	}
	
	return nil
}

// Replace all tags for an item (used for bulk tag updates)
func (r *TagRepository) ReplaceItemTags(itemID, itemType, userID string, tagNames []string) ([]models.Tag, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	
	// Soft delete all existing tags for this item
	_, err = tx.Exec(`
		UPDATE tags
		SET deleted_at = $1, updated_at = $2
		WHERE item_id = $3 AND item_type = $4 AND user_id = $5 AND deleted_at IS NULL
	`, time.Now(), time.Now(), itemID, itemType, userID)
	if err != nil {
		return nil, err
	}
	
	var tags []models.Tag
	
	// Create new tags
	for _, tagName := range tagNames {
		if tagName == "" {
			continue
		}
		
		query := `
			INSERT INTO tags (name, item_id, item_type, user_id, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, name, item_id, item_type, user_id, created_at, updated_at, deleted_at
		`
		
		now := time.Now()
		var tag models.Tag
		err = tx.QueryRow(query, tagName, itemID, itemType, userID, now, now).Scan(
			&tag.ID, &tag.Name, &tag.ItemID, &tag.ItemType, &tag.UserID, &tag.CreatedAt, &tag.UpdatedAt, &tag.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		
		tags = append(tags, tag)
	}
	
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	
	return tags, nil
}

// Helper function to get tag by name and item
func (r *TagRepository) getTagByNameAndItem(name, itemID, itemType, userID string) (*models.Tag, error) {
	query := `
		SELECT id, name, item_id, item_type, user_id, created_at, updated_at, deleted_at
		FROM tags
		WHERE name = $1 AND item_id = $2 AND item_type = $3 AND user_id = $4 AND deleted_at IS NULL
	`
	
	var tag models.Tag
	err := r.db.QueryRow(query, name, itemID, itemType, userID).Scan(
		&tag.ID, &tag.Name, &tag.ItemID, &tag.ItemType, &tag.UserID, &tag.CreatedAt, &tag.UpdatedAt, &tag.DeletedAt,
	)
	if err != nil {
		return nil, err
	}
	
	return &tag, nil
}