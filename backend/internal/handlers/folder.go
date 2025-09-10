package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type FolderHandler struct {
	folderRepo *repository.FolderRepository
}

func NewFolderHandler(folderRepo *repository.FolderRepository) *FolderHandler {
	return &FolderHandler{
		folderRepo: folderRepo,
	}
}

func (h *FolderHandler) GetFolderData(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Get folder ID from URL parameter (empty string for root)
	folderID := c.Param("id")

	// Get complete folder data
	folderData, err := h.folderRepo.GetFolderData(folderID, userID)
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

	folders, err := h.folderRepo.GetAllUserFolders(userID)
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

	folder, err := h.folderRepo.CreateFolder(req.Name, req.ParentID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "foreign key") || strings.Contains(err.Error(), "parent") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent folder not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
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

	folder, err := h.folderRepo.UpdateFolder(folderID, req.Name, userID)
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

	err = h.folderRepo.DeleteFolder(folderID, userID)
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

	var req models.MoveFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	newParentID := ""
	if req.ParentID != nil {
		newParentID = *req.ParentID
	}

	folder, err := h.folderRepo.MoveFolder(folderID, newParentID, userID)
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
