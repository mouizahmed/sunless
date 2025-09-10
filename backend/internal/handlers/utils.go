package handlers

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
)

func removeNonAlphanumeric(s string) string {
	var builder strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

func getUserID(c *gin.Context) (string, error) {
	userID := c.GetString("userID")
	if userID == "" {
		return "", fmt.Errorf("user not authenticated")
	}
	return userID, nil
}
