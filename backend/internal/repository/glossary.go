package repository

import (
	"fmt"
	"strings"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type GlossaryRepository struct {
	db *database.DB
}

func NewGlossaryRepository(db *database.DB) *GlossaryRepository {
	return &GlossaryRepository{db: db}
}

func (r *GlossaryRepository) CreateGlossary(name string, userID string) (*models.Glossary, error) {
	query := `
		INSERT INTO glossaries (name, user_id, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		RETURNING id, name, user_id, created_at, updated_at
	`

	var glossary models.Glossary
	err := r.db.QueryRow(query, name, userID).Scan(
		&glossary.ID,
		&glossary.Name,
		&glossary.UserID,
		&glossary.CreatedAt,
		&glossary.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database error: failed to create glossary")
	}

	return &glossary, nil
}

func (r *GlossaryRepository) GetGlossaries(userID string) ([]*models.Glossary, error) {
	query := `
		SELECT 
			g.id, 
			g.name, 
			g.user_id, 
			g.created_at, 
			g.updated_at,
			COALESCE(COUNT(gi.id), 0) as item_count
		FROM glossaries g
		LEFT JOIN glossary_items gi ON g.id = gi.glossary_id AND gi.deleted_at IS NULL
		WHERE g.user_id = $1 AND g.deleted_at IS NULL
		GROUP BY g.id, g.name, g.user_id, g.created_at, g.updated_at
		ORDER BY g.created_at DESC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database error: failed to get glossaries")
	}

	defer rows.Close()

	var glossaries []*models.Glossary
	for rows.Next() {
		var glossary models.Glossary
		err := rows.Scan(
			&glossary.ID,
			&glossary.Name,
			&glossary.UserID,
			&glossary.CreatedAt,
			&glossary.UpdatedAt,
			&glossary.ItemCount,
		)

		if err != nil {
			return nil, fmt.Errorf("database error: failed to scan glossary")
		}

		glossaries = append(glossaries, &glossary)
	}

	return glossaries, nil
}

func (r *GlossaryRepository) GetGlossaryItems(glossaryID string, userID string) (string, []*models.GlossaryItem, error) {
	query := `
		SELECT g.name, gi.id, gi.glossary_id, gi.word, gi.intensifier, gi.created_at, gi.updated_at
		FROM glossary_items gi
		JOIN glossaries g ON g.id = gi.glossary_id
		WHERE gi.glossary_id = $1 AND g.user_id = $2 AND gi.deleted_at IS NULL AND g.deleted_at IS NULL
		ORDER BY gi.created_at DESC
	`

	rows, err := r.db.Query(query, glossaryID, userID)
	if err != nil {
		fmt.Println(err.Error())
		if strings.Contains(err.Error(), "foreign key") {
			return "", nil, fmt.Errorf("database error: glossary not found")
		} else if strings.Contains(err.Error(), "connection") {
			return "", nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return "", nil, fmt.Errorf("database error: failed to get glossary items")
	}

	defer rows.Close()

	var glossaryName string
	var glossaryItems []*models.GlossaryItem
	for rows.Next() {
		var glossaryItem models.GlossaryItem
		err := rows.Scan(
			&glossaryName,
			&glossaryItem.ID,
			&glossaryItem.GlossaryID,
			&glossaryItem.Word,
			&glossaryItem.Intensifier,
			&glossaryItem.CreatedAt,
			&glossaryItem.UpdatedAt,
		)

		if err != nil {
			return "", nil, fmt.Errorf("database error: failed to scan glossary item")
		}

		glossaryItems = append(glossaryItems, &glossaryItem)
	}

	// If no items, we need to get the glossary name separately
	if len(glossaryItems) == 0 {
		nameQuery := `SELECT name FROM glossaries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`
		err := r.db.QueryRow(nameQuery, glossaryID, userID).Scan(&glossaryName)
		if err != nil {
			return "", nil, fmt.Errorf("database error: glossary not found")
		}
	}

	return glossaryName, glossaryItems, nil
}

func (r *GlossaryRepository) CreateGlossaryItem(word string, intensifier int, glossaryID string, userID string) (*models.GlossaryItem, error) {
	query := `
		INSERT INTO glossary_items (word, intensifier, glossary_id, created_at, updated_at)
		SELECT $1, $2, $3, NOW(), NOW()
		FROM glossaries g
		WHERE g.id = $3 AND g.user_id = $4 AND g.deleted_at IS NULL
		RETURNING id, glossary_id, word, intensifier, created_at, updated_at
	`

	var glossaryItem models.GlossaryItem
	err := r.db.QueryRow(query, word, intensifier, glossaryID, userID).Scan(
		&glossaryItem.ID,
		&glossaryItem.GlossaryID,
		&glossaryItem.Word,
		&glossaryItem.Intensifier,
		&glossaryItem.CreatedAt,
		&glossaryItem.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return nil, fmt.Errorf("database error: glossary not found")
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database error: failed to create glossary item")
	}

	return &glossaryItem, nil
}

func (r *GlossaryRepository) UpdateGlossaryItem(word *string, intensifier *int, itemID string, userID string) (*models.GlossaryItem, error) {
	query := `
		UPDATE glossary_items gi
		SET word = COALESCE($1, gi.word), intensifier = COALESCE($2, gi.intensifier), updated_at = NOW()
		FROM glossaries g
		WHERE gi.id = $3 AND g.id = gi.glossary_id AND g.user_id = $4 AND gi.deleted_at IS NULL AND g.deleted_at IS NULL
		RETURNING gi.id, gi.glossary_id, gi.word, gi.intensifier, gi.created_at, gi.updated_at
	`

	var glossaryItem models.GlossaryItem
	err := r.db.QueryRow(query, word, intensifier, itemID, userID).Scan(
		&glossaryItem.ID,
		&glossaryItem.GlossaryID,
		&glossaryItem.Word,
		&glossaryItem.Intensifier,
		&glossaryItem.CreatedAt,
		&glossaryItem.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return nil, fmt.Errorf("database error: glossary not found")
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database error: failed to update glossary item")
	}

	return &glossaryItem, nil
}

func (r *GlossaryRepository) DeleteGlossaryItem(itemID string, userID string) error {
	query := `
		UPDATE glossary_items gi
		SET deleted_at = NOW(), updated_at = NOW()
		FROM glossaries g
		WHERE gi.id = $1 AND gi.glossary_id = g.id AND g.user_id = $2 AND gi.deleted_at IS NULL AND g.deleted_at IS NULL
	`

	result, err := r.db.Exec(query, itemID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return fmt.Errorf("database connection error: unable to connect to database")
		}

		return fmt.Errorf("database error: failed to delete glossary item")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("database error: failed to verify deletion")
	} else if rowsAffected == 0 {
		return fmt.Errorf("glossary item not found or already deleted")
	}

	return nil
}

func (r *GlossaryRepository) UpdateGlossary(glossaryID string, name string, userID string) (*models.Glossary, error) {
	query := `
		UPDATE glossaries g
		SET name = $2, updated_at = NOW()
		WHERE g.id = $1 AND g.user_id = $3 AND g.deleted_at IS NULL
		RETURNING id, name, user_id, created_at, updated_at
	`

	var glossary models.Glossary
	err := r.db.QueryRow(query, glossaryID, name, userID).Scan(
		&glossary.ID,
		&glossary.Name,
		&glossary.UserID,
		&glossary.CreatedAt,
		&glossary.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database error: failed to update glossary")
	}

	return &glossary, nil
}

func (r *GlossaryRepository) DeleteGlossary(glossaryID string, userID string) error {
	query := `
		UPDATE glossaries g
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE g.id = $1 AND g.user_id = $2 AND g.deleted_at IS NULL
	`

	result, err := r.db.Exec(query, glossaryID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return fmt.Errorf("database connection error: unable to connect to database")
		}

		return fmt.Errorf("database error: failed to delete glossary")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("database error: failed to verify deletion")
	} else if rowsAffected == 0 {
		return fmt.Errorf("glossary not found or already deleted")
	}

	return nil
}
