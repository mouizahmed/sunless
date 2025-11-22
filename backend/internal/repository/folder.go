package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/models"
)

type FolderRepository struct {
	db      *database.DB
	tagRepo *TagRepository
}

func NewFolderRepository(db *database.DB, tagRepo *TagRepository) *FolderRepository {
	return &FolderRepository{
		db:      db,
		tagRepo: tagRepo,
	}
}

// GetUserByEmail gets a user ID by email address
func (r *FolderRepository) GetUserByEmail(email string) (string, error) {
	var userID string
	query := `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`
	err := r.db.QueryRow(query, email).Scan(&userID)
	return userID, err
}

// Helper method to populate tags for a folder
func (r *FolderRepository) populateTags(folder *models.Folder) error {
	if folder == nil {
		return nil
	}

	tags, err := r.tagRepo.GetTagsForItem(folder.ID, "folder", folder.UserID)
	if err != nil {
		return err
	}

	folder.Tags = tags
	return nil
}

// Helper method to populate tags for multiple folders
func (r *FolderRepository) populateTagsForFolders(folders []models.Folder) error {
	for i := range folders {
		if err := r.populateTags(&folders[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *FolderRepository) GetFolderByID(folderID, userID, workspaceID string) (*models.Folder, error) {
	query := `
		SELECT id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at, deleted_at
		FROM folders
		WHERE id = $1 AND user_id = $2 AND workspace_id = $3 AND deleted_at IS NULL
	`

	var folder models.Folder
	err := r.db.QueryRow(query, folderID, userID, workspaceID).Scan(
		&folder.ID,
		&folder.Name,
		&folder.ParentID,
		&folder.UserID,
		&folder.WorkspaceID,
		&folder.AccessMode,
		&folder.InheritSettings,
		&folder.CreatedAt,
		&folder.UpdatedAt,
		&folder.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database query error: failed to retrieve folder")
	}

	// Populate tags from tags table
	if err := r.populateTags(&folder); err != nil {
		return nil, fmt.Errorf("failed to load folder tags: %w", err)
	}

	return &folder, nil
}

func (r *FolderRepository) GetBreadcrumbs(folderID, userID, workspaceID string) ([]models.Breadcrumb, error) {
	breadcrumbs := []models.Breadcrumb{
		{ID: nil, Name: "All Files", Href: "/dashboard"},
	}

	// If folderID is empty, we're at root/dashboard level
	if folderID == "" {
		return breadcrumbs, nil
	}

	// Build path recursively using CTE
	query := `
		WITH RECURSIVE folder_path AS (
			-- Base case: start with the target folder
			SELECT id, name, parent_id, 1 as level
			FROM folders
			WHERE id = $1 AND user_id = $2 AND workspace_id = $3 AND deleted_at IS NULL

			UNION ALL

			-- Recursive case: get parent folders
			SELECT f.id, f.name, f.parent_id, fp.level + 1
			FROM folders f
			INNER JOIN folder_path fp ON f.id = fp.parent_id
			WHERE f.user_id = $2 AND f.workspace_id = $3 AND f.deleted_at IS NULL
		)
		SELECT id, name
		FROM folder_path
		ORDER BY level DESC
	`

	rows, err := r.db.Query(query, folderID, userID, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get breadcrumbs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, fmt.Errorf("failed to scan breadcrumb: %w", err)
		}

		breadcrumbs = append(breadcrumbs, models.Breadcrumb{
			ID:   &id,
			Name: name,
			Href: fmt.Sprintf("/dashboard/folder/%s", id),
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating breadcrumbs: %w", err)
	}

	return breadcrumbs, nil
}

// GetFolderContents retrieves folders and files in a given folder
func (r *FolderRepository) GetFolderContents(folderID, userID, workspaceID string) (*models.FolderContents, error) {

	contents := &models.FolderContents{
		Folders: []models.Folder{},
		Files:   []models.File{},
	}

	// Get folders only for now
	var folderQuery string
	var folderArgs []interface{}

	if folderID == "" {
		// Root/dashboard level - get folders with no parent (parent_id IS NULL)
		folderQuery = `SELECT id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at FROM folders WHERE user_id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND parent_id IS NULL ORDER BY name`
		folderArgs = []interface{}{userID, workspaceID}
	} else {
		// Specific folder - get child folders
		folderQuery = `SELECT id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at FROM folders WHERE user_id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND parent_id = $3 ORDER BY name`
		folderArgs = []interface{}{userID, workspaceID, folderID}
	}

	rows, err := r.db.Query(folderQuery, folderArgs...)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database query error: failed to retrieve folders")
	}
	defer rows.Close()

	for rows.Next() {
		var folder models.Folder
		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.UserID,
			&folder.WorkspaceID,
			&folder.AccessMode,
			&folder.InheritSettings,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("data parsing error: failed to read folder information")
		}
		contents.Folders = append(contents.Folders, folder)
	}

	// Populate tags for all folders
	if err := r.populateTagsForFolders(contents.Folders); err != nil {
		return nil, fmt.Errorf("failed to load folder tags: %w", err)
	}

	// TODO: Add files later - for now only handling folders
	// Files array will remain empty but that's fine for dashboard

	return contents, nil
}

// GetFolderData returns complete folder data including breadcrumbs and contents
func (r *FolderRepository) GetFolderData(folderID, userID, workspaceID string) (*models.FolderDataResponse, error) {
	var folder *models.Folder
	var err error

	// Get folder info if not root (empty folderID means root/dashboard)
	if folderID != "" {
		folder, err = r.GetFolderByID(folderID, userID, workspaceID)
		if err != nil {
			return nil, err
		}
		if folder == nil {
			return nil, fmt.Errorf("folder not found")
		}
	}
	// If folderID is empty, folder remains nil which represents root/dashboard

	// Get breadcrumbs
	breadcrumbs, err := r.GetBreadcrumbs(folderID, userID, workspaceID)
	if err != nil {
		return nil, err
	}

	// Get folder contents
	contents, err := r.GetFolderContents(folderID, userID, workspaceID)
	if err != nil {
		return nil, err
	}

	// Get users with access to this folder
	members := []models.FolderUserAccess{}
	if folderID != "" && folder != nil {
		members, err = r.GetFolderAccessUsers(folderID)
		if err != nil {
			return nil, err
		}
	}

	// Build response
	response := &models.FolderDataResponse{
		Folder:      folder, // nil for root/dashboard, actual folder object for subfolders
		Breadcrumbs: breadcrumbs,
		Contents:    *contents,
		Members:     members,
		Stats: struct {
			TotalFiles   int `json:"total_files"`
			TotalFolders int `json:"total_folders"`
		}{
			TotalFiles:   len(contents.Files),
			TotalFolders: len(contents.Folders),
		},
	}

	return response, nil
}

// GetAllUserFolders retrieves all folders for a user in a workspace (for tree view)
func (r *FolderRepository) GetAllUserFolders(userID, workspaceID string) ([]models.Folder, error) {
	query := `
		SELECT id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at
		FROM folders
		WHERE user_id = $1 AND workspace_id = $2 AND deleted_at IS NULL
		ORDER BY name
	`

	rows, err := r.db.Query(query, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}
		return nil, fmt.Errorf("database query error: failed to retrieve folders")
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.UserID,
			&folder.WorkspaceID,
			&folder.AccessMode,
			&folder.InheritSettings,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("data parsing error: failed to read folder information")
		}
		folders = append(folders, folder)
	}

	// Populate tags for all folders
	if err := r.populateTagsForFolders(folders); err != nil {
		return nil, fmt.Errorf("failed to load folder tags: %w", err)
	}

	return folders, nil
}

// UpdateFolder updates a folder's name
func (r *FolderRepository) UpdateFolder(folderID, name, userID, workspaceID string) (*models.Folder, error) {
	// First check if the folder exists and belongs to the user
	existingFolder, err := r.GetFolderByID(folderID, userID, workspaceID)
	if err != nil {
		return nil, err
	}
	if existingFolder == nil {
		return nil, fmt.Errorf("folder not found")
	}

	query := `
		UPDATE folders
		SET name = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND workspace_id = $4 AND deleted_at IS NULL
		RETURNING id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at
	`

	var folder models.Folder
	err = r.db.QueryRow(query, name, folderID, userID, workspaceID).Scan(
		&folder.ID,
		&folder.Name,
		&folder.ParentID,
		&folder.UserID,
		&folder.WorkspaceID,
		&folder.AccessMode,
		&folder.InheritSettings,
		&folder.CreatedAt,
		&folder.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			return nil, fmt.Errorf("folder already exists: a folder with this name already exists in this location")
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database error: failed to update folder")
	}

	// Populate tags from tags table
	if err := r.populateTags(&folder); err != nil {
		return nil, fmt.Errorf("failed to load folder tags: %w", err)
	}

	return &folder, nil
}

// CreateFolder creates a new folder
func (r *FolderRepository) CreateFolder(name string, parentID *string, userID, workspaceID, accessMode string, inheritSettings bool) (*models.Folder, error) {
	query := `
		INSERT INTO folders (name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at
	`

	var folder models.Folder
	err := r.db.QueryRow(query, name, parentID, userID, workspaceID, accessMode, inheritSettings).Scan(
		&folder.ID,
		&folder.Name,
		&folder.ParentID,
		&folder.UserID,
		&folder.WorkspaceID,
		&folder.AccessMode,
		&folder.InheritSettings,
		&folder.CreatedAt,
		&folder.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			return nil, fmt.Errorf("folder already exists: a folder with this name already exists in this location")
		} else if strings.Contains(err.Error(), "foreign key") {
			return nil, fmt.Errorf("invalid parent folder: the specified parent folder does not exist")
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		// Print actual error for debugging
		fmt.Printf("CreateFolder SQL error: %v\n", err)
		return nil, fmt.Errorf("database error: failed to create folder: %v", err)
	}

	// Initialize empty tags (no tags on creation)
	folder.Tags = []models.Tag{}

	return &folder, nil
}

// DeleteFolder soft deletes a folder and all its descendants by setting deleted_at timestamp
func (r *FolderRepository) DeleteFolder(folderID, userID, workspaceID string) error {
	// First check if the folder exists and belongs to the user
	existingFolder, err := r.GetFolderByID(folderID, userID, workspaceID)
	if err != nil {
		return err
	}
	if existingFolder == nil {
		return fmt.Errorf("folder not found")
	}

	// Use recursive CTE to soft delete the folder and all its descendants
	query := `
		WITH RECURSIVE folder_tree AS (
			-- Base case: start with the folder to delete
			SELECT id, parent_id
			FROM folders
			WHERE id = $1 AND user_id = $2 AND workspace_id = $3 AND deleted_at IS NULL

			UNION ALL

			-- Recursive case: get all descendant folders
			SELECT f.id, f.parent_id
			FROM folders f
			INNER JOIN folder_tree ft ON f.parent_id = ft.id
			WHERE f.user_id = $2 AND f.workspace_id = $3 AND f.deleted_at IS NULL
		)
		UPDATE folders
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id IN (SELECT id FROM folder_tree) AND user_id = $2 AND workspace_id = $3
	`

	result, err := r.db.Exec(query, folderID, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "connection") {
			return fmt.Errorf("database connection error: unable to connect to database")
		}

		return fmt.Errorf("database error: failed to delete folder")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("database error: failed to verify deletion")
	} else if rowsAffected == 0 {
		return fmt.Errorf("folder not found or already deleted")
	}

	return nil
}

// MoveFolder moves a folder to a new parent location
func (r *FolderRepository) MoveFolder(folderID, newParentID, userID, workspaceID string) (*models.Folder, error) {
	existingFolder, err := r.GetFolderByID(folderID, userID, workspaceID)
	if err != nil {
		return nil, err
	} else if existingFolder == nil {
		return nil, fmt.Errorf("folder not found")
	}

	if newParentID != "" {
		parentFolder, err := r.GetFolderByID(newParentID, userID, workspaceID)
		if err != nil {
			return nil, err
		} else if parentFolder == nil {
			return nil, fmt.Errorf("destination folder not found")
		} else if err := r.validateNoCircularReference(folderID, newParentID, userID, workspaceID); err != nil {
			return nil, err
		}
	}

	// Convert empty string to nil for database
	var parentID *string
	if newParentID != "" {
		parentID = &newParentID
	}

	query := `
		UPDATE folders
		SET parent_id = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND workspace_id = $4 AND deleted_at IS NULL
		RETURNING id, name, parent_id, user_id, workspace_id, access_mode, inherit_settings, created_at, updated_at
	`

	var folder models.Folder
	err = r.db.QueryRow(query, parentID, folderID, userID, workspaceID).Scan(
		&folder.ID,
		&folder.Name,
		&folder.ParentID,
		&folder.UserID,
		&folder.WorkspaceID,
		&folder.AccessMode,
		&folder.InheritSettings,
		&folder.CreatedAt,
		&folder.UpdatedAt,
	)

	if err != nil {
		if strings.Contains(err.Error(), "foreign key") {
			return nil, fmt.Errorf("invalid destination folder: the specified parent folder does not exist")
		} else if strings.Contains(err.Error(), "connection") {
			return nil, fmt.Errorf("database connection error: unable to connect to database")
		}

		return nil, fmt.Errorf("database error: failed to move folder")
	}

	// Populate tags from tags table
	if err := r.populateTags(&folder); err != nil {
		return nil, fmt.Errorf("failed to load folder tags: %w", err)
	}

	return &folder, nil
}

// validateNoCircularReference ensures a folder is not moved into itself or its descendants
func (r *FolderRepository) validateNoCircularReference(folderID, newParentID, userID, workspaceID string) error {
	// Use recursive CTE to find all descendants of the folder being moved
	query := `
		WITH RECURSIVE descendants AS (
			-- Base case: start with the folder being moved
			SELECT id, parent_id
			FROM folders
			WHERE id = $1 AND user_id = $2 AND workspace_id = $3 AND deleted_at IS NULL

			UNION ALL

			-- Recursive case: get all child folders
			SELECT f.id, f.parent_id
			FROM folders f
			INNER JOIN descendants d ON f.parent_id = d.id
			WHERE f.user_id = $2 AND f.workspace_id = $3 AND f.deleted_at IS NULL
		)
		SELECT COUNT(*)
		FROM descendants
		WHERE id = $4
	`

	var count int
	err := r.db.QueryRow(query, folderID, userID, workspaceID, newParentID).Scan(&count)

	if err != nil {
		return fmt.Errorf("failed to validate move operation: %w", err)
	} else if count > 0 {
		return fmt.Errorf("cannot move folder into itself or its descendants")
	}

	return nil
}

// GetFolderAccessUsers returns all users with access to a folder (owner + shared users)
func (r *FolderRepository) GetFolderAccessUsers(folderID string) ([]models.FolderUserAccess, error) {
	// First get the owner
	var ownerID string
	err := r.db.QueryRow(`
		SELECT user_id FROM folders
		WHERE id = $1 AND deleted_at IS NULL
	`, folderID).Scan(&ownerID)

	if err != nil {
		return nil, fmt.Errorf("failed to get folder owner: %w", err)
	}

	// Get owner details
	var owner models.FolderUserAccess
	err = r.db.QueryRow(`
		SELECT id, name, email, avatar_url
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`, ownerID).Scan(&owner.UserID, &owner.Name, &owner.Email, &owner.AvatarURL)

	if err != nil {
		return nil, fmt.Errorf("failed to get owner details: %w", err)
	}
	owner.IsOwner = true

	// Get all users with explicit access via folder_access table
	query := `
		SELECT u.id, u.name, u.email, u.avatar_url
		FROM folder_access fa
		JOIN users u ON fa.user_id = u.id
		WHERE fa.folder_id = $1 AND u.deleted_at IS NULL
		ORDER BY fa.created_at ASC
	`

	rows, err := r.db.Query(query, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get folder access users: %w", err)
	}
	defer rows.Close()

	members := []models.FolderUserAccess{owner} // Owner is always first
	for rows.Next() {
		var member models.FolderUserAccess
		err := rows.Scan(&member.UserID, &member.Name, &member.Email, &member.AvatarURL)
		if err != nil {
			return nil, fmt.Errorf("failed to scan folder access user: %w", err)
		}
		member.IsOwner = false
		members = append(members, member)
	}

	return members, nil
}

// Access Control Methods

// CheckFolderAccess determines if a user can access a folder and returns their permission level
func (r *FolderRepository) CheckFolderAccess(userID, folderID string) (bool, string, error) {
	// First check if user owns the folder
	var ownerID string
	err := r.db.QueryRow(`
		SELECT user_id FROM folders
		WHERE id = $1 AND deleted_at IS NULL
	`, folderID).Scan(&ownerID)

	if err != nil {
		return false, "", fmt.Errorf("folder not found: %w", err)
	}

	if ownerID == userID {
		return true, "owner", nil
	}

	// Get folder's effective access mode (considering inheritance)
	effectiveAccessMode, err := r.getEffectiveAccessMode(folderID)
	if err != nil {
		return false, "", err
	}

	// If workspace mode, check workspace membership
	if effectiveAccessMode == "workspace" {
		var workspaceID string
		err := r.db.QueryRow(`
			SELECT workspace_id FROM folders
			WHERE id = $1 AND deleted_at IS NULL
		`, folderID).Scan(&workspaceID)

		if err != nil {
			return false, "", err
		}

		// Check if user is workspace member
		var count int
		err = r.db.QueryRow(`
			SELECT COUNT(*) FROM workspace_members
			WHERE workspace_id = $1 AND user_id = $2 AND left_at IS NULL
		`, workspaceID, userID).Scan(&count)

		if err != nil {
			return false, "", err
		}

		if count > 0 {
			return true, "workspace", nil
		}
	}

	// Check explicit folder access
	var accessType string
	err = r.db.QueryRow(`
		SELECT access_type FROM folder_access
		WHERE folder_id = $1 AND user_id = $2
	`, folderID, userID).Scan(&accessType)

	if err != nil {
		if err == sql.ErrNoRows {
			return false, "none", nil
		}
		return false, "", err
	}

	return true, accessType, nil
}

// getEffectiveAccessMode resolves the effective access mode considering inheritance
func (r *FolderRepository) getEffectiveAccessMode(folderID string) (string, error) {
	var accessMode string
	var inheritSettings bool
	var parentID *string

	err := r.db.QueryRow(`
		SELECT access_mode, inherit_settings, parent_id
		FROM folders
		WHERE id = $1 AND deleted_at IS NULL
	`, folderID).Scan(&accessMode, &inheritSettings, &parentID)

	if err != nil {
		return "", fmt.Errorf("failed to get folder settings: %w", err)
	}

	// If not inheriting or no parent, use own settings
	if !inheritSettings || parentID == nil {
		return accessMode, nil
	}

	// Recursively get parent's effective access mode
	return r.getEffectiveAccessMode(*parentID)
}

// GrantFolderAccess grants access to a user for a specific folder
func (r *FolderRepository) GrantFolderAccess(folderID, userID, accessType, grantedBy string) error {
	_, err := r.db.Exec(`
		INSERT INTO folder_access (folder_id, user_id, access_type, granted_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (folder_id, user_id)
		DO UPDATE SET access_type = $3, granted_by = $4, updated_at = NOW()
	`, folderID, userID, accessType, grantedBy)

	if err != nil {
		return fmt.Errorf("failed to grant folder access: %w", err)
	}

	return nil
}

// RevokeFolderAccess removes a user's access to a folder
func (r *FolderRepository) RevokeFolderAccess(folderID, userID string) error {
	_, err := r.db.Exec(`
		DELETE FROM folder_access
		WHERE folder_id = $1 AND user_id = $2
	`, folderID, userID)

	if err != nil {
		return fmt.Errorf("failed to revoke folder access: %w", err)
	}

	return nil
}

// GetFolderMembers returns all users with explicit access to a folder
func (r *FolderRepository) GetFolderMembers(folderID string) ([]models.FolderMemberResponse, error) {
	query := `
		SELECT fa.user_id, u.email, u.name, fa.access_type, fa.granted_by, fa.created_at
		FROM folder_access fa
		JOIN users u ON fa.user_id = u.id
		WHERE fa.folder_id = $1
		ORDER BY fa.created_at DESC
	`

	rows, err := r.db.Query(query, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get folder members: %w", err)
	}
	defer rows.Close()

	var members []models.FolderMemberResponse
	for rows.Next() {
		var member models.FolderMemberResponse
		err := rows.Scan(
			&member.UserID,
			&member.Email,
			&member.Name,
			&member.AccessType,
			&member.GrantedBy,
			&member.GrantedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan folder member: %w", err)
		}
		members = append(members, member)
	}

	return members, nil
}

// GetSharedFolders returns folders that have been shared with the user
func (r *FolderRepository) GetSharedFolders(userID string) ([]models.Folder, error) {
	query := `
		SELECT DISTINCT f.id, f.name, f.parent_id, f.user_id, f.workspace_id,
			   f.access_mode, f.inherit_settings, f.created_at, f.updated_at
		FROM folders f
		JOIN folder_access fa ON f.id = fa.folder_id
		WHERE fa.user_id = $1 AND f.user_id != $1 AND f.deleted_at IS NULL
		ORDER BY f.name
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get shared folders: %w", err)
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.UserID,
			&folder.WorkspaceID,
			&folder.AccessMode,
			&folder.InheritSettings,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan shared folder: %w", err)
		}
		folders = append(folders, folder)
	}

	// Populate tags for all folders
	if err := r.populateTagsForFolders(folders); err != nil {
		return nil, fmt.Errorf("failed to populate tags: %w", err)
	}

	return folders, nil
}

// UpdateFolderSettings updates the access mode and inheritance settings of a folder
func (r *FolderRepository) UpdateFolderSettings(folderID, userID string, req *models.UpdateFolderSettingsRequest) error {
	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if req.AccessMode != nil {
		setParts = append(setParts, fmt.Sprintf("access_mode = $%d", argCount))
		args = append(args, *req.AccessMode)
		argCount++
	}

	if req.InheritSettings != nil {
		setParts = append(setParts, fmt.Sprintf("inherit_settings = $%d", argCount))
		args = append(args, *req.InheritSettings)
		argCount++
	}

	if len(setParts) == 0 {
		return fmt.Errorf("no fields to update")
	}

	setParts = append(setParts, fmt.Sprintf("updated_at = NOW()"))

	query := fmt.Sprintf(`
		UPDATE folders
		SET %s
		WHERE id = $%d AND user_id = $%d AND deleted_at IS NULL
	`, strings.Join(setParts, ", "), argCount, argCount+1)

	args = append(args, folderID, userID)

	result, err := r.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update folder settings: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("folder not found or insufficient permissions")
	}

	return nil
}
