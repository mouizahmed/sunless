package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type GlossaryHandler struct {
	glossaryRepo *repository.GlossaryRepository
}

func NewGlossaryHandler(glossaryRepo *repository.GlossaryRepository) *GlossaryHandler {
	return &GlossaryHandler{
		glossaryRepo: glossaryRepo,
	}
}

func (h *GlossaryHandler) CreateGlossary(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.CreateGlossaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	} else if len(req.Name) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name must be less than 50 characters"})
		return
	}

	glossary, err := h.glossaryRepo.CreateGlossary(req.Name, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create glossary"})
		return
	}

	c.JSON(http.StatusCreated, glossary)
}

func (h *GlossaryHandler) GetGlossaries(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	glossaries, err := h.glossaryRepo.GetGlossaries(userID)
	if err != nil {
		if err.Error() == "database connection error: unable to connect to database" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"glossaries": glossaries,
	})
}

func (h *GlossaryHandler) GetGlossaryItems(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	glossaryID := c.Param("id")
	if len(glossaryID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Glossary ID is required"})
		return
	}

	glossaryName, glossaryItems, err := h.glossaryRepo.GetGlossaryItems(glossaryID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		if strings.Contains(err.Error(), "glossary not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Glossary not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve glossary items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"glossary_name": glossaryName,
		"glossaryItems": glossaryItems,
	})
}

func (h *GlossaryHandler) CreateGlossaryItem(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req models.CreateGlossaryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	glossaryID := c.Param("id")
	if len(glossaryID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Glossary ID is required"})
		return
	}

	word := removeNonAlphanumeric(req.Word)
	if len(word) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Word is required"})
		return
	} else if len(word) > 30 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Word must be less than 30 characters"})
		return
	}

	glossaryItem, err := h.glossaryRepo.CreateGlossaryItem(word, req.Intensifier, glossaryID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		if strings.Contains(err.Error(), "glossary not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Glossary not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create glossary item"})
		return
	}

	c.JSON(http.StatusCreated, glossaryItem)
}

func (h *GlossaryHandler) UpdateGlossaryItem(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	itemID := c.Param("itemId")
	if len(itemID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item ID is required"})
		return
	}

	var req models.UpdateGlossaryItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var sanitizedWord *string

	if req.Word != nil {
		word := removeNonAlphanumeric(*req.Word)
		if len(word) > 30 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Word must be less than 30 characters"})
			return
		} else if len(word) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Word is required"})
			return
		}
		sanitizedWord = &word
	}

	glossaryItem, err := h.glossaryRepo.UpdateGlossaryItem(sanitizedWord, req.Intensifier, itemID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		if strings.Contains(err.Error(), "glossary not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Glossary item not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update glossary item"})
		return
	}

	c.JSON(http.StatusOK, glossaryItem)
}

func (h *GlossaryHandler) DeleteGlossaryItem(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	itemID := c.Param("itemId")
	if len(itemID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item ID is required"})
		return
	}

	err = h.glossaryRepo.DeleteGlossaryItem(itemID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		if strings.Contains(err.Error(), "glossary item not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Glossary item not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete glossary item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Glossary item deleted successfully"})
}

func (h *GlossaryHandler) UpdateGlossary(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	glossaryID := c.Param("id")
	if len(glossaryID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Glossary ID is required"})
		return
	}

	var req models.UpdateGlossaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	} else if len(req.Name) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name must be less than 50 characters"})
		return
	}

	glossary, err := h.glossaryRepo.UpdateGlossary(glossaryID, req.Name, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		if strings.Contains(err.Error(), "glossary not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Glossary not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update glossary"})
		return
	}

	c.JSON(http.StatusOK, glossary)
}

func (h *GlossaryHandler) DeleteGlossary(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	glossaryID := c.Param("id")
	if len(glossaryID) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Glossary ID is required"})
		return
	}

	err = h.glossaryRepo.DeleteGlossary(glossaryID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "database connection error") {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database connection error"})
			return
		}
		if strings.Contains(err.Error(), "glossary not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Glossary not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete glossary"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Glossary deleted successfully"})
}
