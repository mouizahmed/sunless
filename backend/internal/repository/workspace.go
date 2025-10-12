package repository

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"strings"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type WorkspaceRepository struct {
	db *database.DB
}

func NewWorkspaceRepository(db *database.DB) *WorkspaceRepository {
	return &WorkspaceRepository{
		db: db,
	}
}

// generateSlug creates a unique slug from workspace name with random suffix
func (r *WorkspaceRepository) generateSlug(name string) string {
	// Sanitize the name: lowercase, replace spaces with hyphens, remove special chars
	reg := regexp.MustCompile(`[^a-z0-9\s-]`)
	slug := strings.ToLower(name)
	slug = reg.ReplaceAllString(slug, "")
	slug = regexp.MustCompile(`\s+`).ReplaceAllString(slug, "-")
	slug = regexp.MustCompile(`-+`).ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")

	// If slug is empty after sanitization, use "workspace"
	if slug == "" {
		slug = "workspace"
	}

	// Generate random suffix (6 characters: alphanumeric)
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	suffix := make([]byte, 6)
	for i := range suffix {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		suffix[i] = charset[num.Int64()]
	}

	return slug + "-" + string(suffix)
}

// EnsureUserHasWorkspace creates a personal workspace if user has no workspaces
func (r *WorkspaceRepository) EnsureUserHasWorkspace(userID, userName, userEmail string) (*models.WorkspaceResponse, error) {
	// Check if user already has any workspaces
	workspaces, err := r.GetUserWorkspaces(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing workspaces: %v", err)
	}

	// If user already has workspaces, return the first one
	if len(workspaces) > 0 {
		return &workspaces[0], nil
	}

	// Generate personal workspace name
	workspaceName := "Personal"
	if userName != "" {
		workspaceName = userName + "'s Workspace"
	} else if userEmail != "" {
		// Extract name from email (part before @)
		if atIndex := strings.Index(userEmail, "@"); atIndex > 0 {
			emailPrefix := userEmail[:atIndex]
			// Capitalize first letter
			if len(emailPrefix) > 0 {
				emailPrefix = strings.ToUpper(string(emailPrefix[0])) + emailPrefix[1:]
			}
			workspaceName = emailPrefix + "'s Workspace"
		}
	}

	// Create personal workspace
	workspace, err := r.CreateWorkspace(workspaceName, "", userID)
	if err != nil {
		return nil, fmt.Errorf("failed to create personal workspace: %v", err)
	}

	return workspace, nil
}

// GetUserWorkspaces retrieves all workspaces a user has access to
func (r *WorkspaceRepository) GetUserWorkspaces(userID string) ([]models.WorkspaceResponse, error) {
	query := `
		SELECT
			w.id, w.name, w.description, w.slug, w.owner_user_id, w.settings,
			w.created_at, w.updated_at, w.deleted_at,
			wm.role,
			COUNT(wm2.user_id) as member_count
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		LEFT JOIN workspace_members wm2 ON w.id = wm2.workspace_id AND wm2.left_at IS NULL
		WHERE wm.user_id = $1 AND wm.left_at IS NULL AND w.deleted_at IS NULL
		GROUP BY w.id, w.name, w.description, w.slug, w.owner_user_id, w.settings,
				 w.created_at, w.updated_at, w.deleted_at, wm.role
		ORDER BY w.created_at ASC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database query error: failed to retrieve workspaces")
	}
	defer rows.Close()

	var workspaces []models.WorkspaceResponse
	for rows.Next() {
		var workspace models.WorkspaceResponse
		var w models.Workspace
		var settingsBytes []byte

		err := rows.Scan(
			&w.ID,
			&w.Name,
			&w.Description,
			&w.Slug,
			&w.OwnerUserID,
			&settingsBytes,
			&w.CreatedAt,
			&w.UpdatedAt,
			&w.DeletedAt,
			&workspace.UserRole,
			&workspace.MemberCount,
		)
		if err != nil {
			return nil, fmt.Errorf("data parsing error: failed to read workspace information")
		}

		// Parse JSON settings
		if len(settingsBytes) > 0 {
			err = json.Unmarshal(settingsBytes, &w.Settings)
			if err != nil {
				return nil, fmt.Errorf("failed to parse workspace settings JSON: %v", err)
			}
		} else {
			w.Settings = make(map[string]interface{})
		}

		workspace.Workspace = &w
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

// GetWorkspaceByID retrieves a workspace by ID if user has access
func (r *WorkspaceRepository) GetWorkspaceByID(workspaceID, userID string) (*models.WorkspaceResponse, error) {
	query := `
		SELECT
			w.id, w.name, w.description, w.slug, w.owner_user_id, w.settings,
			w.created_at, w.updated_at, w.deleted_at,
			wm.role,
			COUNT(wm2.user_id) as member_count
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		LEFT JOIN workspace_members wm2 ON w.id = wm2.workspace_id AND wm2.left_at IS NULL
		WHERE w.id = $1 AND wm.user_id = $2 AND wm.left_at IS NULL AND w.deleted_at IS NULL
		GROUP BY w.id, w.name, w.description, w.slug, w.owner_user_id, w.settings,
				 w.created_at, w.updated_at, w.deleted_at, wm.role
	`

	var workspace models.WorkspaceResponse
	var w models.Workspace
	var settingsBytes []byte

	err := r.db.QueryRow(query, workspaceID, userID).Scan(
		&w.ID,
		&w.Name,
		&w.Description,
		&w.Slug,
		&w.OwnerUserID,
		&settingsBytes,
		&w.CreatedAt,
		&w.UpdatedAt,
		&w.DeletedAt,
		&workspace.UserRole,
		&workspace.MemberCount,
	)

	if err == nil {
		// Parse JSON settings
		if len(settingsBytes) > 0 {
			err = json.Unmarshal(settingsBytes, &w.Settings)
			if err != nil {
				return nil, fmt.Errorf("failed to parse workspace settings JSON: %v", err)
			}
		} else {
			w.Settings = make(map[string]interface{})
		}
	}

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database query error: failed to retrieve workspace")
	}

	workspace.Workspace = &w
	return &workspace, nil
}

// CreateWorkspace creates a new workspace and adds the creator as owner
func (r *WorkspaceRepository) CreateWorkspace(name, description, userID string) (*models.WorkspaceResponse, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("database error: failed to start transaction")
	}
	defer tx.Rollback()

	// Generate unique slug
	slug := r.generateSlug(name)

	// Create workspace
	query := `
		INSERT INTO workspaces (name, description, slug, owner_user_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, name, description, slug, owner_user_id, settings, created_at, updated_at
	`

	var workspace models.Workspace
	var settingsBytes []byte
	err = tx.QueryRow(query, name, description, slug, userID).Scan(
		&workspace.ID,
		&workspace.Name,
		&workspace.Description,
		&workspace.Slug,
		&workspace.OwnerUserID,
		&settingsBytes,
		&workspace.CreatedAt,
		&workspace.UpdatedAt,
	)

	if err == nil {
		// Parse JSON settings
		if len(settingsBytes) > 0 {
			err = json.Unmarshal(settingsBytes, &workspace.Settings)
			if err != nil {
				return nil, fmt.Errorf("failed to parse workspace settings JSON: %v", err)
			}
		} else {
			workspace.Settings = make(map[string]interface{})
		}
	}

	if err != nil {
		fmt.Printf("❌ CreateWorkspace error: %v\n", err)
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database error: failed to create workspace - %v", err)
	}

	// Add creator as owner member
	memberQuery := `
		INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
		VALUES ($1, $2, 'owner', NOW())
	`

	_, err = tx.Exec(memberQuery, workspace.ID, userID)
	if err != nil {
		return nil, fmt.Errorf("database error: failed to add owner as member")
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("database error: failed to commit transaction")
	}

	// Return the workspace with member count by fetching it again
	workspaceResponse, err := r.GetWorkspaceByID(workspace.ID, userID)
	if err != nil {
		return nil, fmt.Errorf("database error: failed to retrieve created workspace")
	}

	return workspaceResponse, nil
}

// UpdateWorkspace updates workspace details
func (r *WorkspaceRepository) UpdateWorkspace(workspaceID, userID string, updates *models.UpdateWorkspaceRequest) (*models.Workspace, error) {
	// Check if user has permission to update (owner or admin)
	workspace, err := r.GetWorkspaceByID(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if workspace == nil {
		return nil, fmt.Errorf("workspace not found")
	}
	if workspace.UserRole != "owner" && workspace.UserRole != "admin" {
		return nil, fmt.Errorf("insufficient permissions: only owners and admins can update workspace")
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *updates.Description)
		argIndex++
	}
	if updates.Slug != nil {
		setParts = append(setParts, fmt.Sprintf("slug = $%d", argIndex))
		args = append(args, *updates.Slug)
		argIndex++
	}

	if len(setParts) == 0 {
		return workspace.Workspace, nil // No updates needed
	}

	setParts = append(setParts, fmt.Sprintf("updated_at = NOW()"))
	args = append(args, workspaceID)

	query := fmt.Sprintf(`
		UPDATE workspaces
		SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, name, description, slug, owner_user_id, settings, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var updatedWorkspace models.Workspace
	err = r.db.QueryRow(query, args...).Scan(
		&updatedWorkspace.ID,
		&updatedWorkspace.Name,
		&updatedWorkspace.Description,
		&updatedWorkspace.Slug,
		&updatedWorkspace.OwnerUserID,
		&updatedWorkspace.Settings,
		&updatedWorkspace.CreatedAt,
		&updatedWorkspace.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database error: failed to update workspace")
	}

	return &updatedWorkspace, nil
}

// DeleteWorkspace soft deletes a workspace (only owner can delete)
func (r *WorkspaceRepository) DeleteWorkspace(workspaceID, userID string) error {
	// Check if user is owner
	workspace, err := r.GetWorkspaceByID(workspaceID, userID)
	if err != nil {
		return err
	}
	if workspace == nil {
		return fmt.Errorf("workspace not found")
	}
	if workspace.UserRole != "owner" {
		return fmt.Errorf("insufficient permissions: only workspace owner can delete workspace")
	}

	query := `
		UPDATE workspaces
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND owner_user_id = $2 AND deleted_at IS NULL
	`

	result, err := r.db.Exec(query, workspaceID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return fmt.Errorf("database connection error: unable to connect to database")
		}
		return fmt.Errorf("database error: failed to delete workspace")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("database error: failed to verify deletion")
	} else if rowsAffected == 0 {
		return fmt.Errorf("workspace not found or already deleted")
	}

	return nil
}

// UserHasWorkspaceAccess checks if user has access to workspace
func (r *WorkspaceRepository) UserHasWorkspaceAccess(userID, workspaceID string) (bool, error) {
	query := `
		SELECT 1 FROM workspace_members
		WHERE user_id = $1 AND workspace_id = $2 AND left_at IS NULL
	`

	var exists int
	err := r.db.QueryRow(query, userID, workspaceID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("database error: failed to check workspace access")
	}

	return true, nil
}