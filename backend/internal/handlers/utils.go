package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func getUserID(c *gin.Context) (string, error) {
	userID := c.GetString("userID")
	if userID == "" {
		return "", fmt.Errorf("user not authenticated")
	}
	return userID, nil
}
