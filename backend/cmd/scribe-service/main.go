package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load("cmd/scribe-service/.env")
	if err != nil {
		log.Fatal("Error loading cmd/scribe-service/.env file")
	}

	// Initialize the router
	router := gin.Default()

	// API Routes
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Start the server
	port := os.Getenv("SCRIBE_SERVICE_PORT")
	if port == "" {
		port = "8081" // Default port if not specified
	}
	log.Printf("Starting scribe service on port %s", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start scribe service: %v", err)
	} else {
		log.Printf("Scribe service started on port %s", port)
	}
}

