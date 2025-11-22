package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type FolderHandler struct {
	folderRepo    *repository.FolderRepository
	workspaceRepo *repository.WorkspaceRepository
}

func NewFolderHandler(folderRepo *repository.FolderRepository, workspaceRepo *repository.WorkspaceRepository) *FolderHandler {
	return &FolderHandler{
		folderRepo:    folderRepo,
		workspaceRepo: workspaceRepo,
	}
}

func (h *FolderHandler) GetFolderData(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Get workspace ID from query parameter
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id is required"})
		return
	}

	// Check if user has access to workspace
	hasAccess, err := h.workspaceRepo.UserHasWorkspaceAccess(userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
		return
	}

	// Get folder ID from URL parameter (empty string for root)
	folderID := c.Param("id")

	// Get complete folder data
	folderData, err := h.folderRepo.GetFolderData(folderID, userID, workspaceID)
	if err != nil {
		if err.Error() == "folder not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, folderData)
}

func (h *FolderHandler) GetAllFolders(c *gin.Context) { // for tree view
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Get workspace ID from query parameter
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id is required"})
		return
	}

	// Check if user has access to workspace
	hasAccess, err := h.workspaceRepo.UserHasWorkspaceAccess(userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
		return
	}

	folders, err := h.folderRepo.GetAllUserFolders(userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"folders": folders,
	})
}

func (h *FolderHandler) CreateFolder(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder name cannot be empty"})
		return
	} else if len(req.Name) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder name must be less than 255 characters"})
		return
	}

	// Check if user has access to workspace
	hasAccess, err := h.workspaceRepo.UserHasWorkspaceAccess(userID, req.WorkspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
		return
	}

	// Set default values if not provided
	accessMode := req.AccessMode
	if accessMode == "" {
		accessMode = "workspace"
	}

	// Debug: print the access mode being used
	fmt.Printf("Creating folder with access_mode: '%s' (length: %d)\n", accessMode, len(accessMode))

	folder, err := h.folderRepo.CreateFolder(req.Name, req.ParentID, userID, req.WorkspaceID, accessMode, req.InheritSettings)
	if err != nil {
		if strings.Contains(err.Error(), "foreign key") || strings.Contains(err.Error(), "parent") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent folder not found"})
			return
		}
		// Print the actual error for debugging
		fmt.Printf("Error creating folder: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Database error: %v", err)})
		return
	}

	c.JSON(http.StatusCreated, folder)
}

func (h *FolderHandler) UpdateFolder(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	if len(folderID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID is required"})
		return
	}

	// Get workspace ID from query parameter
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id is required"})
		return
	}

	// Check if user has access to workspace
	hasAccess, err := h.workspaceRepo.UserHasWorkspaceAccess(userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
		return
	}

	var req models.UpdateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder name cannot be empty"})
		return
	}

	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder name cannot be empty"})
		return
	} else if len(req.Name) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder name must be less than 255 characters"})
		return
	}

	folder, err := h.folderRepo.UpdateFolder(folderID, req.Name, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found or you don't have access to it"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, folder)
}


func (h *FolderHandler) DeleteFolder(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	if len(folderID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID is required"})
		return
	}

	// Get workspace ID from query parameter
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id is required"})
		return
	}

	// Check if user has access to workspace
	hasAccess, err := h.workspaceRepo.UserHasWorkspaceAccess(userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
		return
	}

	err = h.folderRepo.DeleteFolder(folderID, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "folder not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found or you don't have access to it"})
			return
		}
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder deleted successfully"})
}

func (h *FolderHandler) MoveFolder(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	if len(folderID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID is required"})
		return
	}

	// Get workspace ID from query parameter
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id is required"})
		return
	}

	// Check if user has access to workspace
	hasAccess, err := h.workspaceRepo.UserHasWorkspaceAccess(userID, workspaceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to workspace"})
		return
	}

	var req models.MoveFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	newParentID := ""
	if req.ParentID != nil {
		newParentID = *req.ParentID
	}

	folder, err := h.folderRepo.MoveFolder(folderID, newParentID, userID, workspaceID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found or you don't have access to it"})
			return
		} else if strings.Contains(err.Error(), "circular") || strings.Contains(err.Error(), "descendants") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot move folder into itself or its descendants"})
			return
		} else if strings.Contains(err.Error(), "destination folder") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "The destination folder does not exist or you don't have access to it"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, folder)
}

// ShareFolder shares a folder with specific users
func (h *FolderHandler) ShareFolder(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	if len(folderID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID is required"})
		return
	}

	var req models.ShareFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate access type
	if req.AccessType != "view" && req.AccessType != "edit" && req.AccessType != "full" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Access type must be view, edit, or full"})
		return
	}

	// Check if user can share this folder (owner or has full access)
	canAccess, accessType, err := h.folderRepo.CheckFolderAccess(userID, folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !canAccess || (accessType != "owner" && accessType != "full") {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to share this folder"})
		return
	}

	// TODO: Add userRepo dependency to FolderHandler constructor
	// For now, we'll use a direct query - this should be refactored
	sharedCount := 0
	errors := []string{}

	for _, email := range req.UserEmails {
		// Get user ID from email
		targetUserID, err := h.folderRepo.GetUserByEmail(email)

		if err != nil {
			errors = append(errors, fmt.Sprintf("User with email %s not found", email))
			continue
		}

		// Grant folder access
		err = h.folderRepo.GrantFolderAccess(folderID, targetUserID, req.AccessType, userID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to share with %s: %v", email, err))
			continue
		}

		sharedCount++
	}

	response := gin.H{
		"shared_count": sharedCount,
		"total_count":  len(req.UserEmails),
	}

	if len(errors) > 0 {
		response["errors"] = errors
	}

	if sharedCount == 0 {
		c.JSON(http.StatusBadRequest, response)
	} else {
		c.JSON(http.StatusOK, response)
	}
}

// GetFolderMembers returns users with access to a folder
func (h *FolderHandler) GetFolderMembers(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	if len(folderID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID is required"})
		return
	}

	// Check if user can view folder members
	canAccess, accessType, err := h.folderRepo.CheckFolderAccess(userID, folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !canAccess || (accessType != "owner" && accessType != "full") {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view folder members"})
		return
	}

	members, err := h.folderRepo.GetFolderMembers(folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"members": members,
	})
}

// RemoveFolderAccess removes a user's access to a folder
func (h *FolderHandler) RemoveFolderAccess(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	targetUserID := c.Param("userId")

	if len(folderID) == 0 || len(targetUserID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID and User ID are required"})
		return
	}

	// Check if user can manage folder access
	canAccess, accessType, err := h.folderRepo.CheckFolderAccess(userID, folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !canAccess || (accessType != "owner" && accessType != "full") {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to manage folder access"})
		return
	}

	err = h.folderRepo.RevokeFolderAccess(folderID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Access removed successfully"})
}

// UpdateFolderSettings updates folder access settings
func (h *FolderHandler) UpdateFolderSettings(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folderID := c.Param("id")
	if len(folderID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Folder ID is required"})
		return
	}

	var req models.UpdateFolderSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate access mode if provided
	if req.AccessMode != nil {
		if *req.AccessMode != "workspace" && *req.AccessMode != "invite_only" && *req.AccessMode != "private" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Access mode must be workspace, invite_only, or private"})
			return
		}
	}

	// Check if user owns the folder
	canAccess, accessType, err := h.folderRepo.CheckFolderAccess(userID, folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if !canAccess || accessType != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only folder owners can update settings"})
		return
	}

	err = h.folderRepo.UpdateFolderSettings(folderID, userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "insufficient permissions") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found or insufficient permissions"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder settings updated successfully"})
}

// GetSharedFolders returns folders shared with the current user
func (h *FolderHandler) GetSharedFolders(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	folders, err := h.folderRepo.GetSharedFolders(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"folders": folders,
	})
}
