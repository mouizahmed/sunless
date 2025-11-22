package handlers

import (
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/mouizahmed/justscribe-backend/internal/auth"
)

type WebSocketHandler struct {
	connections map[string]*websocket.Conn
	mutex       sync.RWMutex
}

type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

const (
	MsgCalendarUpdated = "calendar_updated"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// TODO: Restrict origins in production
		return true
	},
	Subprotocols: []string{"bearer"}, // Accept bearer sub-protocol
}

func NewWebSocketHandler() *WebSocketHandler {
	return &WebSocketHandler{
		connections: make(map[string]*websocket.Conn),
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get Firebase ID token from WebSocket sub-protocol for authentication
	protocols := c.Request.Header.Get("Sec-WebSocket-Protocol")
	if protocols == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authentication protocol"})
		return
	}

	// Parse sub-protocols (format: "bearer, <token>")
	protocolParts := strings.Split(protocols, ", ")
	if len(protocolParts) != 2 || protocolParts[0] != "bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authentication protocol"})
		return
	}

	token := protocolParts[1]

	// Get Firebase client and verify token
	firebaseClient := auth.GetFirebaseClient()
	if firebaseClient == nil {
		log.Printf("Firebase client not initialized")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Authentication service not available"})
		return
	}

	// Verify the Firebase ID token
	firebaseToken, err := firebaseClient.VerifyIDToken(token)
	if err != nil {
		log.Printf("Firebase token verification failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authentication token"})
		return
	}

	// Extract user ID from Firebase token
	userID := firebaseToken.UID
	if userID == "" {
		log.Printf("No user ID found in Firebase token claims")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("❌ Failed to upgrade WebSocket for user %s: %v", userID, err)
		return
	}
	defer conn.Close()

	// Store connection
	h.mutex.Lock()
	h.connections[userID] = conn
	h.mutex.Unlock()

	log.Printf("🔌 WebSocket connected for user: %s", userID)

	// Clean up connection when done
	defer func() {
		h.mutex.Lock()
		delete(h.connections, userID)
		h.mutex.Unlock()
		log.Printf("🔌 WebSocket disconnected for user: %s", userID)
	}()

	// Keep connection alive and handle incoming messages
	for {
		// Read message from client (for ping/pong or future client->server messages)
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ WebSocket error for user %s: %v", userID, err)
			}
			break
		}
	}
}

// BroadcastCalendarUpdate sends calendar update to specific user
func (h *WebSocketHandler) BroadcastCalendarUpdate(userID string, events interface{}) error {
	h.mutex.RLock()
	conn, exists := h.connections[userID]
	h.mutex.RUnlock()

	if !exists {
		// User not connected, no need to send
		return nil
	}

	message := WSMessage{
		Type: MsgCalendarUpdated,
		Data: events,
	}

	h.mutex.Lock()
	err := conn.WriteJSON(message)
	h.mutex.Unlock()

	if err != nil {
		log.Printf("❌ Failed to send calendar update to user %s: %v", userID, err)
		// Remove failed connection
		h.mutex.Lock()
		delete(h.connections, userID)
		h.mutex.Unlock()
		return err
	}

	log.Printf("📅 Sent calendar update to user: %s", userID)
	return nil
}

// GetConnectedUsers returns list of currently connected user IDs
func (h *WebSocketHandler) GetConnectedUsers() []string {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	users := make([]string, 0, len(h.connections))
	for userID := range h.connections {
		users = append(users, userID)
	}
	return users
}