package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type WorkspaceHandler struct {
	workspaceRepo *repository.WorkspaceRepository
}

func NewWorkspaceHandler(workspaceRepo *repository.WorkspaceRepository) *WorkspaceHandler {
	return &WorkspaceHandler{
		workspaceRepo: workspaceRepo,
	}
}

// GetUserWorkspaces retrieves all workspaces a user has access to
func (h *WorkspaceHandler) GetUserWorkspaces(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Get user info from context for workspace creation
	userName := ""
	userEmail := ""
	if claims, exists := c.Get("firebaseClaims"); exists {
		if claimsMap, ok := claims.(map[string]interface{}); ok {
			if name, ok := claimsMap["name"].(string); ok {
				userName = name
			}
			if email, ok := claimsMap["email"].(string); ok {
				userEmail = email
			}
		}
	}

	// Ensure user has at least one workspace (auto-creates if none exist)
	_, err = h.workspaceRepo.EnsureUserHasWorkspace(userID, userName, userEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ensure workspace exists"})
		return
	}

	workspaces, err := h.workspaceRepo.GetUserWorkspaces(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, models.UserWorkspacesResponse{
		Workspaces: workspaces,
	})
}

// GetWorkspace retrieves a specific workspace by ID
func (h *WorkspaceHandler) GetWorkspace(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	workspaceID := c.Param("id")
	if len(workspaceID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace ID is required"})
		return
	}

	workspace, err := h.workspaceRepo.GetWorkspaceByID(workspaceID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if workspace == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found or you don't have access"})
		return
	}

	c.JSON(http.StatusOK, workspace)
}

// CreateWorkspace creates a new workspace
func (h *WorkspaceHandler) CreateWorkspace(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace name cannot be empty"})
		return
	} else if len(req.Name) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace name must be less than 255 characters"})
		return
	}

	// Convert pointers to values for the repository call
	description := ""
	if req.Description != nil {
		description = *req.Description
	}

	workspace, err := h.workspaceRepo.CreateWorkspace(req.Name, description, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusCreated, workspace)
}

// UpdateWorkspace updates an existing workspace
func (h *WorkspaceHandler) UpdateWorkspace(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	workspaceID := c.Param("id")
	if len(workspaceID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace ID is required"})
		return
	}

	var req models.UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate fields if provided
	if req.Name != nil && len(*req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace name cannot be empty"})
		return
	} else if req.Name != nil && len(*req.Name) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace name must be less than 255 characters"})
		return
	}

	if req.Slug != nil && len(*req.Slug) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace slug must be less than 100 characters"})
		return
	}

	workspace, err := h.workspaceRepo.UpdateWorkspace(workspaceID, userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found or you don't have access"})
			return
		} else if strings.Contains(err.Error(), "insufficient permissions") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only workspace owners and admins can update workspace settings"})
			return
		} else if strings.Contains(err.Error(), "already exists") {
			c.JSON(http.StatusConflict, gin.H{"error": "A workspace with this name or slug already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, workspace)
}

// DeleteWorkspace deletes a workspace (only owner can delete)
func (h *WorkspaceHandler) DeleteWorkspace(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	workspaceID := c.Param("id")
	if len(workspaceID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workspace ID is required"})
		return
	}

	// Check if this is the user's last workspace
	userWorkspaces, err := h.workspaceRepo.GetUserWorkspaces(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if len(userWorkspaces) <= 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your last workspace. Create another workspace first."})
		return
	}

	err = h.workspaceRepo.DeleteWorkspace(workspaceID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found or you don't have access"})
			return
		} else if strings.Contains(err.Error(), "insufficient permissions") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only workspace owner can delete workspace"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Workspace deleted successfully"})
}
