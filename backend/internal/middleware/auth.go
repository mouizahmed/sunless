package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
)

type contextKey string

const UserIDKey contextKey = "userID"

// AuthMiddleware validates Clerk JWT tokens and extracts user ID
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Authentication required",
				"message": "Missing Authorization header. Please include 'Authorization: Bearer <token>' in your request.",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid authorization format",
				"message": "Authorization header must be in format 'Bearer <token>'. Received: " + authHeader,
			})
			c.Abort()
			return
		}

		token := tokenParts[1]

		// Initialize Clerk client
		clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")
		if clerkSecretKey == "" {
			log.Printf("CLERK_SECRET_KEY not set")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Server configuration error",
				"message": "Authentication service is not properly configured. Please contact support.",
			})
			c.Abort()
			return
		}

		clerk.SetKey(clerkSecretKey)

		// Verify the JWT token with detailed error handling
		claims, err := jwt.Verify(context.Background(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			// Check if it's a clock skew issue and retry with a small delay
			if strings.Contains(err.Error(), "token issued in the future") {
				log.Printf("Clock skew detected, retrying JWT verification: %v", err)
				time.Sleep(1 * time.Second)
				claims, err = jwt.Verify(context.Background(), &jwt.VerifyParams{
					Token: token,
				})
				if err != nil {
					log.Printf("JWT verification failed after retry: %v", err)
				} else {
					log.Printf("JWT verification succeeded after retry")
				}
			}

			if err != nil {
				// Provide specific error messages based on the error type
				var errorMsg, userMsg string

				if strings.Contains(err.Error(), "token is expired") {
					errorMsg = "Token expired"
					userMsg = "Your session has expired. Please sign in again."
				} else if strings.Contains(err.Error(), "token issued in the future") {
					errorMsg = "Token timing issue"
					userMsg = "Authentication timing error. Please try again in a few seconds."
				} else if strings.Contains(err.Error(), "signature is invalid") {
					errorMsg = "Invalid token signature"
					userMsg = "Invalid authentication token. Please sign in again."
				} else if strings.Contains(err.Error(), "token is malformed") {
					errorMsg = "Malformed token"
					userMsg = "Invalid token format. Please sign in again."
				} else {
					errorMsg = "Token validation failed"
					userMsg = "Authentication failed. Please sign in again."
				}

				log.Printf("JWT verification failed: %v", err)
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   errorMsg,
					"message": userMsg,
				})
				c.Abort()
				return
			}
		}

		// Extract user ID from claims
		userID := claims.Subject
		if userID == "" {
			log.Printf("No user ID found in JWT claims")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Invalid token claims",
				"message": "Token is missing required user information. Please sign in again.",
			})
			c.Abort()
			return
		}

		// Store user ID in context for use by handlers
		c.Set(string(UserIDKey), userID)
		c.Next()
	}
}

// GetUserIDFromContext extracts the user ID from the Gin context
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	userID, exists := c.Get(string(UserIDKey))
	if !exists {
		return "", false
	}

	userIDStr, ok := userID.(string)
	return userIDStr, ok
}
