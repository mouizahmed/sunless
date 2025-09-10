package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type TagHandler struct {
	tagRepo *repository.TagRepository
}

func NewTagHandler(tagRepo *repository.TagRepository) *TagHandler {
	return &TagHandler{
		tagRepo: tagRepo,
	}
}

// Get all tags for a specific item
func (h *TagHandler) GetItemTags(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	itemID := c.Param("item_id")
	itemType := c.Query("type") // folder or file

	if itemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item ID is required"})
		return
	}

	if itemType == "" || (itemType != "folder" && itemType != "file") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item type must be 'folder' or 'file'"})
		return
	}

	tags, err := h.tagRepo.GetTagsForItem(itemID, itemType, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tags": tags})
}

// Create a new tag
func (h *TagHandler) CreateTag(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate inputs
	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag name cannot be empty"})
		return
	}

	if len(req.Name) > 30 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag name must be less than 30 characters"})
		return
	}

	if req.ItemType != "folder" && req.ItemType != "file" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item type must be 'folder' or 'file'"})
		return
	}

	tag, err := h.tagRepo.CreateTag(req.Name, req.ItemID, req.ItemType, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusCreated, tag)
}

// Update a tag
func (h *TagHandler) UpdateTag(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	tagID := c.Param("id")
	if tagID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag ID is required"})
		return
	}

	var req models.UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag name cannot be empty"})
		return
	}

	if len(req.Name) > 30 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag name must be less than 30 characters"})
		return
	}

	tag, err := h.tagRepo.UpdateTag(tagID, req.Name, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found or you don't have access to it"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, tag)
}

// Delete a tag
func (h *TagHandler) DeleteTag(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	tagID := c.Param("id")
	if tagID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tag ID is required"})
		return
	}

	err = h.tagRepo.DeleteTag(tagID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found or you don't have access to it"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted successfully"})
}

// Replace all tags for an item (bulk update)
func (h *TagHandler) UpdateItemTags(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	itemID := c.Param("item_id")
	itemType := c.Query("type") // folder or file

	if itemID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item ID is required"})
		return
	}

	if itemType == "" || (itemType != "folder" && itemType != "file") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item type must be 'folder' or 'file'"})
		return
	}

	var req models.UpdateItemTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate tags
	if len(req.Tags) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 5 tags allowed"})
		return
	}

	for _, tag := range req.Tags {
		if len(tag) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tag names cannot be empty"})
			return
		}
		if len(tag) > 30 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tag names must be less than 30 characters"})
			return
		}
	}

	tags, err := h.tagRepo.ReplaceItemTags(itemID, itemType, userID, req.Tags)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tags": tags})
}