package handlers

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func getUserID(c *gin.Context) (string, error) {
	userID := c.GetString("userID")
	if userID == "" {
		return "", fmt.Errorf("user not authenticated")
	}
	return userID, nil
}

func sanitizeFileName(name string) string {
	cleaned := strings.ReplaceAll(name, "\\", "")
	cleaned = strings.ReplaceAll(cleaned, "/", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "-")
	if cleaned == "" {
		cleaned = fmt.Sprintf("attachment-%s.bin", uuid.NewString())
	}
	return cleaned
}
