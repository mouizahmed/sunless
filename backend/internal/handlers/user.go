package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type UserHandler struct {
	userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
	return &UserHandler{
		userRepo: userRepo,
	}
}

// GetCurrentUser returns the current authenticated user's information
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Fetch user from database
	user, err := h.userRepo.GetUserByID(userID)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user information"})
		return
	}

	// Return user data (excluding sensitive fields)
	c.JSON(http.StatusOK, gin.H{
		"id":              user.ID,
		"email":           user.Email,
		"name":            user.Name,
		"avatar_url":      user.AvatarURL,
		"plan":            user.Plan,
		"status":          user.Status,
		"email_verified":  user.EmailVerified,
		"api_quota_used":  user.APIQuotaUsed,
		"api_quota_limit": user.APIQuotaLimit,
		"created_at":      user.CreatedAt,
		"updated_at":      user.UpdatedAt,
	})
}
