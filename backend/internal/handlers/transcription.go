package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/mouizahmed/justscribe-backend/internal/auth"
)

type TranscriptionHandler struct{}

func NewTranscriptionHandler() *TranscriptionHandler {
	return &TranscriptionHandler{}
}

var transcriptionUpgrader = websocket.Upgrader{
	ReadBufferSize:  8192,
	WriteBufferSize: 8192,
	CheckOrigin: func(_ *http.Request) bool {
		return true
	},
}

type wsAuthMessage struct {
	Type  string `json:"type"`
	Token string `json:"token"`
}

const authTimeout = 10 * time.Second
const maxWSMessageBytes = 1 << 20 // 1 MiB safety limit
const wsReadTimeout = 70 * time.Second
const wsPingInterval = 25 * time.Second
const wsWriteTimeout = 10 * time.Second

// Stream authenticates the client and proxies audio/results between client and Deepgram.
func (h *TranscriptionHandler) Stream(c *gin.Context) {
	key := os.Getenv("DEEPGRAM_API_KEY")
	if key == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "transcription service unavailable"})
		return
	}

	clientConn, err := transcriptionUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer clientConn.Close()
	clientConn.SetReadLimit(maxWSMessageBytes)

	if err := h.authenticateClientConn(clientConn); err != nil {
		_ = clientConn.WriteJSON(gin.H{"type": "error", "message": err.Error()})
		_ = clientConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "unauthorized"))
		return
	}
	_ = clientConn.WriteJSON(gin.H{"type": "auth_ok"})

	// Tuned for meeting conversations:
	// - keep interim results flowing
	// - reduce over-segmentation on natural pauses
	// - emit VAD/utterance boundaries to improve turn segmentation
	params := "model=nova-2&multichannel=true&channels=2&diarize=true&punctuate=true&smart_format=true&interim_results=true&endpointing=1200&utterance_end_ms=1800&vad_events=true&encoding=linear16&sample_rate=48000"
	deepgramURL := "wss://api.deepgram.com/v1/listen?" + params
	header := http.Header{}
	header.Set("Authorization", "Token "+key)

	deepgramConn, _, err := websocket.DefaultDialer.Dial(deepgramURL, header)
	if err != nil {
		_ = clientConn.WriteJSON(gin.H{"type": "error", "message": "failed to connect transcription provider"})
		return
	}
	defer deepgramConn.Close()
	deepgramConn.SetReadLimit(maxWSMessageBytes)
	clientConn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	deepgramConn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	clientConn.SetPongHandler(func(_ string) error {
		return clientConn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	})
	deepgramConn.SetPongHandler(func(_ string) error {
		return deepgramConn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	})

	errCh := make(chan error, 2)
	done := make(chan struct{})
	defer close(done)
	var clientWriteMu sync.Mutex
	var deepgramWriteMu sync.Mutex

	go func() {
		for {
			messageType, payload, readErr := clientConn.ReadMessage()
			if readErr != nil {
				errCh <- readErr
				return
			}
			if messageType != websocket.BinaryMessage && messageType != websocket.TextMessage {
				continue
			}
			if writeErr := writeWSMessage(deepgramConn, &deepgramWriteMu, messageType, payload); writeErr != nil {
				errCh <- writeErr
				return
			}
		}
	}()

	go func() {
		for {
			messageType, payload, readErr := deepgramConn.ReadMessage()
			if readErr != nil {
				errCh <- readErr
				return
			}
			if messageType != websocket.BinaryMessage && messageType != websocket.TextMessage {
				continue
			}
			if writeErr := writeWSMessage(clientConn, &clientWriteMu, messageType, payload); writeErr != nil {
				errCh <- writeErr
				return
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(wsPingInterval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				if writeErr := writeWSMessage(clientConn, &clientWriteMu, websocket.PingMessage, nil); writeErr != nil {
					errCh <- writeErr
					return
				}
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(wsPingInterval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				if writeErr := writeWSMessage(deepgramConn, &deepgramWriteMu, websocket.PingMessage, nil); writeErr != nil {
					errCh <- writeErr
					return
				}
			}
		}
	}()

	<-errCh
	_ = clientConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
}

func (h *TranscriptionHandler) authenticateClientConn(clientConn *websocket.Conn) error {
	firebaseClient := auth.GetFirebaseClient()
	if firebaseClient == nil {
		return errors.New("auth service unavailable")
	}

	_ = clientConn.SetReadDeadline(time.Now().Add(authTimeout))
	messageType, payload, err := clientConn.ReadMessage()
	if err != nil {
		return errors.New("missing auth message")
	}
	_ = clientConn.SetReadDeadline(time.Time{})
	if messageType != websocket.TextMessage {
		return errors.New("invalid auth message")
	}

	var authMsg wsAuthMessage
	if err := json.Unmarshal(payload, &authMsg); err != nil {
		return errors.New("invalid auth payload")
	}
	if authMsg.Type != "auth" || authMsg.Token == "" {
		return errors.New("invalid auth payload")
	}

	if _, err := firebaseClient.VerifyIDToken(authMsg.Token); err != nil {
		return errors.New("invalid token")
	}
	return nil
}

func writeWSMessage(conn *websocket.Conn, mu *sync.Mutex, messageType int, payload []byte) error {
	mu.Lock()
	defer mu.Unlock()
	if err := conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout)); err != nil {
		return err
	}
	return conn.WriteMessage(messageType, payload)
}
