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
	"github.com/mouizahmed/justscribe-backend/internal/cache"
	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/handlers"
	"github.com/mouizahmed/justscribe-backend/internal/jobs"
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
	workspaceRepo := repository.NewWorkspaceRepository(db)
	tagRepo := repository.NewTagRepository(db.DB)
	folderRepo := repository.NewFolderRepository(db, tagRepo)
	fileRepo := repository.NewFileRepository(db)
	glossaryRepo := repository.NewGlossaryRepository(db)
	transcriptionRepo := repository.NewTranscriptionRepository(db)

	// Initialize B2 client
	b2Client, err := storage.NewB2Client()
	if err != nil {
		log.Fatalf("Failed to initialize B2 client: %v", err)
	}

	// Initialize Redis client for caching
	cacheClient := cache.NewClient(
		os.Getenv("REDIS_ADDR"),
		os.Getenv("REDIS_PASSWORD"),
		0,
	)

	// Test Redis connection
	err = cacheClient.Ping(context.Background())
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// Initialize direct Redis client for OAuth codes
	redisClient := redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	// Initialize Asynq client for job queuing
	jobClient := jobs.NewClient(os.Getenv("REDIS_ADDR"), os.Getenv("REDIS_PASSWORD"))

	// Initialize handlers
	oauthHandler := handlers.NewOAuthHandler(userRepo, workspaceRepo, oauthTokenRepo, redisClient)
	calendarHandler := handlers.NewCalendarHandler(oauthTokenRepo)
	webSocketHandler := handlers.NewWebSocketHandler()

	// Connect calendar handler with WebSocket handler for real-time updates
	calendarHandler.SetWebSocketHandler(webSocketHandler)
	userHandler := handlers.NewUserHandler(userRepo)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceRepo)
	folderHandler := handlers.NewFolderHandler(folderRepo, workspaceRepo)
	tagHandler := handlers.NewTagHandler(tagRepo)
	uploadHandler := handlers.NewUploadHandler(fileRepo, b2Client)
	glossaryHandler := handlers.NewGlossaryHandler(glossaryRepo)
	transcriptionHandler := handlers.NewTranscriptionHandler(transcriptionRepo, fileRepo, jobClient)
	// urlExtractionHandler := handlers.NewURLExtractionHandler(cacheClient, jobClient, fileRepo)
	// sseHandler := handlers.NewSSEHandler(cacheClient)

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

		// WebSocket routes (handles its own authentication)
		api.GET("/ws", webSocketHandler.HandleWebSocket)
	}

	// OAuth routes (no auth required)
	auth := router.Group("/auth")
	{
		auth.GET("/start", oauthHandler.StartOAuth)
		auth.GET("/callback/:provider", oauthHandler.HandleCallback) // Keep for legacy/direct backend flow
		auth.POST("/complete", oauthHandler.CompleteAuth)            // Complete auth with one-time code
	}

	// Authenticated API routes
	authenticated := api.Group("/")
	authenticated.Use(middleware.FirebaseAuthMiddleware())
	{
		// Auth routes (require Firebase auth)
		authenticated.POST("/auth/logout", oauthHandler.Logout)

		// User routes
		authenticated.GET("/user/me", userHandler.GetCurrentUser)

		// Workspace routes
		authenticated.GET("/workspaces", workspaceHandler.GetUserWorkspaces)
		authenticated.GET("/workspaces/:id", workspaceHandler.GetWorkspace)
		authenticated.POST("/workspaces", workspaceHandler.CreateWorkspace)
		authenticated.PATCH("/workspaces/:id", workspaceHandler.UpdateWorkspace)
		authenticated.DELETE("/workspaces/:id", workspaceHandler.DeleteWorkspace)

		// Calendar routes
		authenticated.GET("/calendar/upcoming", calendarHandler.GetUpcomingEvents)

		// Folder routes
		authenticated.GET("/folders", folderHandler.GetFolderData)
		authenticated.GET("/folders/:id", folderHandler.GetFolderData)
		authenticated.GET("/folders/all", folderHandler.GetAllFolders)
		authenticated.GET("/folders/shared", folderHandler.GetSharedFolders)
		authenticated.POST("/folders", folderHandler.CreateFolder)
		authenticated.PATCH("/folders/:id", folderHandler.UpdateFolder)
		authenticated.PATCH("/folders/:id/move", folderHandler.MoveFolder)
		authenticated.DELETE("/folders/:id", folderHandler.DeleteFolder)

		// Folder sharing and access control routes
		authenticated.POST("/folders/:id/share", folderHandler.ShareFolder)
		authenticated.GET("/folders/:id/members", folderHandler.GetFolderMembers)
		authenticated.DELETE("/folders/:id/access/:userId", folderHandler.RemoveFolderAccess)
		authenticated.PUT("/folders/:id/settings", folderHandler.UpdateFolderSettings)

		// Tag routes
		authenticated.GET("/items/:item_id/tags", tagHandler.GetItemTags)
		authenticated.POST("/tags", tagHandler.CreateTag)
		authenticated.PUT("/tags/:id", tagHandler.UpdateTag)
		authenticated.DELETE("/tags/:id", tagHandler.DeleteTag)
		authenticated.PUT("/items/:item_id/tags", tagHandler.UpdateItemTags)

		// Upload routes
		authenticated.POST("/upload/initiate", uploadHandler.InitiateUpload)
		authenticated.POST("/upload/complete", uploadHandler.CompleteUpload)
		authenticated.POST("/upload/:fileId/cancel", uploadHandler.CancelUpload)
		authenticated.DELETE("/upload/:fileId", uploadHandler.DeleteUpload)
		authenticated.GET("/upload/:fileId/status", uploadHandler.GetFileStatus)

		// Glossary routes
		authenticated.POST("/glossaries", glossaryHandler.CreateGlossary)
		authenticated.GET("/glossaries", glossaryHandler.GetGlossaries)
		authenticated.GET("/glossaries/:id/items", glossaryHandler.GetGlossaryItems)
		authenticated.POST("/glossaries/:id/items", glossaryHandler.CreateGlossaryItem)
		authenticated.PATCH("/glossaries-items/:itemId", glossaryHandler.UpdateGlossaryItem)
		authenticated.DELETE("/glossaries-items/:itemId", glossaryHandler.DeleteGlossaryItem)
		authenticated.PATCH("/glossaries/:id", glossaryHandler.UpdateGlossary)
		authenticated.DELETE("/glossaries/:id", glossaryHandler.DeleteGlossary)

		// Transcription routes
		authenticated.POST("/transcriptions/batch", transcriptionHandler.BatchCreateTranscriptions)
		authenticated.GET("/transcriptions", transcriptionHandler.GetTranscriptions)
		authenticated.GET("/transcriptions/:id", transcriptionHandler.GetTranscription)
		authenticated.DELETE("/transcriptions/:id", transcriptionHandler.DeleteTranscription)

		// // URL extraction routes
		// authenticated.POST("/url/extract", urlExtractionHandler.SubmitURL)
		// authenticated.GET("/url/jobs", urlExtractionHandler.GetUserJobs)
		// authenticated.GET("/url/jobs/:jobId", urlExtractionHandler.GetJobStatus)
		// authenticated.POST("/url/jobs/:jobId/cancel", urlExtractionHandler.CancelJob)

		// // SSE routes
		// authenticated.GET("/events/stream", sseHandler.StreamEvents)
		// authenticated.GET("/events/connections", sseHandler.GetActiveConnections)
	}

	// Start calendar polling for real-time updates
	calendarHandler.StartPolling()

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
