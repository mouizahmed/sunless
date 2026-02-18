package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/mouizahmed/justscribe-backend/internal/auth"
	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/handlers"
	"github.com/mouizahmed/justscribe-backend/internal/middleware"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/storage"
	"github.com/mouizahmed/justscribe-backend/internal/utils"
	"github.com/redis/go-redis/v9"
)

func init() {
	gin.SetMode(gin.ReleaseMode)
}

func main() {
	err := godotenv.Load("cmd/api/.env")
	if err != nil {
		log.Fatal("Error loading cmd/api/.env file")
	}

	// Initialize encryption utilities
	if err := utils.InitEncryption(); err != nil {
		log.Fatalf("Failed to initialize encryption: %v", err)
	}

	// Initialize Firebase Admin SDK
	if err := auth.InitFirebase(); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	// Initialize database
	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	oauthTokenRepo := repository.NewOAuthTokenRepository(db)
	noteRepo := repository.NewNoteRepository(db)
	folderRepo := repository.NewFolderRepository(db)
	recordingRepo := repository.NewRecordingSessionRepository(db)
	noteAttachmentRepo := repository.NewNoteAttachmentRepository(db)
	transcriptRepo := repository.NewTranscriptRepository(db)

	// Initialize direct Redis client for OAuth codes
	redisClient := redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	// Test Redis connection
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize handlers
	oauthHandler := handlers.NewOAuthHandler(userRepo, oauthTokenRepo, redisClient)
	userHandler := handlers.NewUserHandler(userRepo)
	folderHandler := handlers.NewFoldersHandler(folderRepo)
	b2Client, err := storage.NewB2Client()
	if err != nil {
		log.Fatalf("Failed to initialize B2 client: %v", err)
	}

	notesHandler := handlers.NewNotesHandler(noteRepo, folderRepo, recordingRepo, b2Client, noteAttachmentRepo)

	transcriptionHandler := handlers.NewTranscriptionHandler()
	transcriptHandler := handlers.NewTranscriptHandler(transcriptRepo, noteRepo)
	calendarHandler := handlers.NewCalendarHandler(oauthTokenRepo)

	// Initialize the router
	router := gin.Default()

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "Cache-Control", "Connection", "Access-Control-Allow-Origin", "svix-id", "svix-timestamp", "svix-signature"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "Cache-Control", "Content-Encoding", "Transfer-Encoding"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API Routes
	api := router.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		api.GET("/transcription/stream", transcriptionHandler.Stream)
	}

	// OAuth routes (no auth required)
	auth := router.Group("/auth")
	{
		auth.GET("/start", oauthHandler.StartOAuth)
		auth.GET("/callback", oauthHandler.HandleCallback)
		auth.POST("/complete", oauthHandler.CompleteAuth) // Complete auth with one-time code
	}

	// Authenticated API routes
	authenticated := api.Group("/")
	authenticated.Use(middleware.FirebaseAuthMiddleware())
	{
		// Auth routes (require Firebase auth)
		authenticated.POST("/auth/logout", oauthHandler.Logout)

		// User routes
		authenticated.GET("/user/me", userHandler.GetCurrentUser)

		// Notes routes
		authenticated.GET("/search", notesHandler.Search)
		authenticated.GET("/notes", notesHandler.ListNotes)
		authenticated.GET("/notes/:noteID", notesHandler.GetNote)
		authenticated.POST("/notes", notesHandler.CreateNote)
		authenticated.PATCH("/notes/:noteID", notesHandler.UpdateNote)
		authenticated.DELETE("/notes/:noteID", notesHandler.DeleteNote)
		authenticated.POST("/notes/enhance", notesHandler.EnhanceNote)
		authenticated.POST("/notes/:noteID/images", notesHandler.UploadImage)
		authenticated.DELETE("/notes/:noteID/images/:imageID", notesHandler.DeleteImage)
		authenticated.POST("/notes/:noteID/recording/start", notesHandler.StartRecording)
		authenticated.POST("/notes/:noteID/recording/:sessionID/stop", notesHandler.StopRecording)

		// Folder routes
		authenticated.GET("/folders", folderHandler.ListFolders)
		authenticated.POST("/folders", folderHandler.CreateFolder)
		authenticated.PATCH("/folders/:folderID", folderHandler.RenameFolder)
		authenticated.DELETE("/folders/:folderID", folderHandler.DeleteFolder)

		// Transcript routes
		authenticated.POST("/notes/:noteID/transcript/segments", transcriptHandler.SaveSegments)
		authenticated.GET("/notes/:noteID/transcript/segments", transcriptHandler.GetSegments)
		authenticated.PATCH("/transcript/speakers/:speakerID", transcriptHandler.UpdateSpeaker)
		authenticated.GET("/transcript/search", transcriptHandler.SearchSegments)

		// Calendar routes
		authenticated.GET("/calendar/upcoming", calendarHandler.GetUpcomingEvents)
	}

	// Start the server
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080" // Default port if not specified
	}
	log.Printf("Starting server on port %s", port)

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	} else {
		log.Printf("Server started on port %s", port)
	}
}
