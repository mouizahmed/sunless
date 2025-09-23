package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type CalendarHandler struct {
	oauthTokenRepo  repository.OAuthTokenRepository
	wsHandler       *WebSocketHandler
	pollingInterval time.Duration
	stopPolling     chan bool
	pollingActive   bool
	pollingMutex    sync.RWMutex
}

type CalendarEvent struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	Location    string    `json:"location,omitempty"`
	Description string    `json:"description,omitempty"`
	Organizer   string    `json:"organizer,omitempty"`
	Provider    string    `json:"provider"`
	IsMeeting   bool      `json:"is_meeting"`
	Attendees   []string  `json:"attendees,omitempty"`
}

func NewCalendarHandler(oauthTokenRepo repository.OAuthTokenRepository) *CalendarHandler {
	return &CalendarHandler{
		oauthTokenRepo:  oauthTokenRepo,
		pollingInterval: 30 * time.Second, // Poll every 30 seconds
		stopPolling:     make(chan bool),
	}
}

// SetWebSocketHandler sets the WebSocket handler for broadcasting updates
func (h *CalendarHandler) SetWebSocketHandler(wsHandler *WebSocketHandler) {
	h.wsHandler = wsHandler
}

// StartPolling begins polling for calendar changes for all connected users
func (h *CalendarHandler) StartPolling() {
	h.pollingMutex.Lock()
	if h.pollingActive {
		h.pollingMutex.Unlock()
		return
	}
	h.pollingActive = true
	h.pollingMutex.Unlock()

	log.Printf("📅 Starting calendar polling every %v", h.pollingInterval)

	go func() {
		ticker := time.NewTicker(h.pollingInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				h.pollCalendarChanges()
			case <-h.stopPolling:
				log.Printf("📅 Stopping calendar polling")
				return
			}
		}
	}()
}

// StopPolling stops the calendar polling
func (h *CalendarHandler) StopPolling() {
	h.pollingMutex.Lock()
	defer h.pollingMutex.Unlock()

	if !h.pollingActive {
		return
	}

	h.pollingActive = false
	select {
	case h.stopPolling <- true:
	default:
	}
}

// pollCalendarChanges checks for calendar changes for all connected users
func (h *CalendarHandler) pollCalendarChanges() {
	if h.wsHandler == nil {
		return
	}

	connectedUsers := h.wsHandler.GetConnectedUsers()
	if len(connectedUsers) == 0 {
		return
	}

	log.Printf("📅 Polling calendar changes for %d connected users", len(connectedUsers))

	for _, userID := range connectedUsers {
		events, err := h.getUpcomingEvents(userID, 3)
		if err != nil {
			log.Printf("❌ Failed to get calendar events for user %s: %v", userID, err)
			continue
		}

		// Broadcast the updated events to the user
		err = h.wsHandler.BroadcastCalendarUpdate(userID, events)
		if err != nil {
			log.Printf("❌ Failed to broadcast calendar update to user %s: %v", userID, err)
		}
	}
}

func (h *CalendarHandler) GetUpcomingEvents(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get limit parameter (default: 10)
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	// Get upcoming events
	events, err := h.getUpcomingEvents(userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch calendar events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"events": events,
	})
}

func (h *CalendarHandler) getUpcomingEvents(userID string, limit int) ([]*CalendarEvent, error) {
	var allEvents []*CalendarEvent

	// Get tokens for all providers
	tokens, err := h.oauthTokenRepo.GetByUser(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get OAuth tokens: %w", err)
	}

	if len(tokens) == 0 {
		return []*CalendarEvent{}, nil
	}

	for _, token := range tokens {
		// Check if token needs refresh
		if token.ExpiresAt != nil && time.Now().After(*token.ExpiresAt) {
			err := h.refreshTokenIfNeeded(userID, token.Provider)
			if err != nil {
				continue // Skip this provider if refresh fails
			}
			// Re-fetch the refreshed token
			refreshedToken, err := h.oauthTokenRepo.GetByUserAndProvider(userID, token.Provider)
			if err != nil {
				continue
			}
			token = refreshedToken
		}

		var events []*CalendarEvent
		switch token.Provider {
		case "google":
			events, err = h.getGoogleCalendarEvents(token, limit)
		case "microsoft":
			events, err = h.getMicrosoftCalendarEvents(token, limit)
		default:
			continue
		}

		if err != nil {
			continue
		}

		allEvents = append(allEvents, events...)
	}

	// Sort events by start time
	for i := 0; i < len(allEvents)-1; i++ {
		for j := 0; j < len(allEvents)-i-1; j++ {
			if allEvents[j].Start.After(allEvents[j+1].Start) {
				allEvents[j], allEvents[j+1] = allEvents[j+1], allEvents[j]
			}
		}
	}

	// Limit results
	if limit > 0 && len(allEvents) > limit {
		allEvents = allEvents[:limit]
	}

	return allEvents, nil
}

func (h *CalendarHandler) refreshTokenIfNeeded(userID, provider string) error {
	token, err := h.oauthTokenRepo.GetByUserAndProvider(userID, provider)
	if err != nil {
		return fmt.Errorf("failed to get token: %w", err)
	}

	if token.RefreshToken == nil {
		return fmt.Errorf("no refresh token available for %s", provider)
	}

	var refreshURL string
	var clientID, clientSecret string

	switch provider {
	case "google":
		refreshURL = "https://oauth2.googleapis.com/token"
		clientID = os.Getenv("GOOGLE_CLIENT_ID")
		clientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	case "microsoft":
		refreshURL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
		clientID = os.Getenv("MICROSOFT_CLIENT_ID")
		clientSecret = os.Getenv("MICROSOFT_CLIENT_SECRET")
	default:
		return fmt.Errorf("unsupported provider: %s", provider)
	}

	// Create OAuth2 token for refresh
	oauthToken := &oauth2.Token{
		AccessToken:  token.AccessToken,
		RefreshToken: *token.RefreshToken,
		TokenType:    "Bearer",
	}
	if token.ExpiresAt != nil {
		oauthToken.Expiry = *token.ExpiresAt
	}

	// Create OAuth2 config for token refresh
	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint: oauth2.Endpoint{
			TokenURL: refreshURL,
		},
	}

	// Refresh the token
	newToken, err := config.TokenSource(context.Background(), oauthToken).Token()
	if err != nil {
		return fmt.Errorf("failed to refresh token: %w", err)
	}

	// Update token in database
	updates := &models.UpdateOAuthTokenRequest{
		AccessToken: &newToken.AccessToken,
	}

	if newToken.RefreshToken != "" {
		updates.RefreshToken = &newToken.RefreshToken
	}

	if !newToken.Expiry.IsZero() {
		updates.ExpiresAt = &newToken.Expiry
	}

	err = h.oauthTokenRepo.Update(userID, provider, updates)
	if err != nil {
		return fmt.Errorf("failed to update token: %w", err)
	}

	return nil
}

func (h *CalendarHandler) getGoogleCalendarEvents(token *models.OAuthToken, limit int) ([]*CalendarEvent, error) {
	client := &http.Client{}

	timeMin := time.Now().Format(time.RFC3339)
	url := fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=%s&orderBy=startTime&singleEvents=true&maxResults=%d", timeMin, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Google Calendar API error: %s", string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var googleResponse struct {
		Items []struct {
			ID      string `json:"id"`
			Summary string `json:"summary"`
			Start   struct {
				DateTime string `json:"dateTime"`
				Date     string `json:"date"`
			} `json:"start"`
			End struct {
				DateTime string `json:"dateTime"`
				Date     string `json:"date"`
			} `json:"end"`
			Location    string `json:"location"`
			Description string `json:"description"`
			Organizer   struct {
				DisplayName string `json:"displayName"`
				Email       string `json:"email"`
			} `json:"organizer"`
			Attendees []struct {
				Email       string `json:"email"`
				DisplayName string `json:"displayName"`
				Optional    bool   `json:"optional"`
			} `json:"attendees"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &googleResponse); err != nil {
		return nil, err
	}

	var events []*CalendarEvent
	for _, item := range googleResponse.Items {
		event := &CalendarEvent{
			ID:          item.ID,
			Title:       item.Summary,
			Location:    item.Location,
			Description: item.Description,
			Provider:    "google",
		}

		// Parse organizer
		if item.Organizer.DisplayName != "" {
			event.Organizer = item.Organizer.DisplayName
		} else if item.Organizer.Email != "" {
			event.Organizer = item.Organizer.Email
		}

		// Parse attendees
		var attendees []string
		for _, attendee := range item.Attendees {
			if attendee.DisplayName != "" {
				attendees = append(attendees, attendee.DisplayName)
			} else if attendee.Email != "" {
				attendees = append(attendees, attendee.Email)
			}
		}
		event.Attendees = attendees

		// Parse start time
		if item.Start.DateTime != "" {
			if startTime, err := time.Parse(time.RFC3339, item.Start.DateTime); err == nil {
				event.Start = startTime
			}
		} else if item.Start.Date != "" {
			if startTime, err := time.Parse("2006-01-02", item.Start.Date); err == nil {
				event.Start = startTime
			}
		}

		// Parse end time
		if item.End.DateTime != "" {
			if endTime, err := time.Parse(time.RFC3339, item.End.DateTime); err == nil {
				event.End = endTime
			}
		} else if item.End.Date != "" {
			if endTime, err := time.Parse("2006-01-02", item.End.Date); err == nil {
				event.End = endTime
			}
		}

		// Determine if this is a meeting
		event.IsMeeting = h.isMeeting(event.Title, event.Description, event.Location, event.Attendees)

		events = append(events, event)
	}

	return events, nil
}

func (h *CalendarHandler) getMicrosoftCalendarEvents(token *models.OAuthToken, limit int) ([]*CalendarEvent, error) {
	client := &http.Client{}

	startTime := time.Now().Format(time.RFC3339)
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '%s'&$orderby=start/dateTime&$top=%d", startTime, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Microsoft Graph API error: %s", string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var microsoftResponse struct {
		Value []struct {
			ID      string `json:"id"`
			Subject string `json:"subject"`
			Start   struct {
				DateTime string `json:"dateTime"`
				TimeZone string `json:"timeZone"`
			} `json:"start"`
			End struct {
				DateTime string `json:"dateTime"`
				TimeZone string `json:"timeZone"`
			} `json:"end"`
			Location struct {
				DisplayName string `json:"displayName"`
			} `json:"location"`
			BodyPreview string `json:"bodyPreview"`
			Organizer   struct {
				EmailAddress struct {
					Name    string `json:"name"`
					Address string `json:"address"`
				} `json:"emailAddress"`
			} `json:"organizer"`
		} `json:"value"`
	}

	if err := json.Unmarshal(body, &microsoftResponse); err != nil {
		return nil, err
	}

	var events []*CalendarEvent
	for _, item := range microsoftResponse.Value {
		event := &CalendarEvent{
			ID:          item.ID,
			Title:       item.Subject,
			Location:    item.Location.DisplayName,
			Description: item.BodyPreview,
			Provider:    "microsoft",
		}

		// Parse organizer
		if item.Organizer.EmailAddress.Name != "" {
			event.Organizer = item.Organizer.EmailAddress.Name
		} else if item.Organizer.EmailAddress.Address != "" {
			event.Organizer = item.Organizer.EmailAddress.Address
		}

		// Parse start time
		if startTime, err := time.Parse(time.RFC3339, item.Start.DateTime); err == nil {
			event.Start = startTime
		}

		// Parse end time
		if endTime, err := time.Parse(time.RFC3339, item.End.DateTime); err == nil {
			event.End = endTime
		}

		// Determine if this is a meeting
		event.IsMeeting = h.isMeeting(event.Title, event.Description, event.Location, event.Attendees)

		events = append(events, event)
	}

	return events, nil
}

// isMeeting determines if an event is likely a meeting based on various criteria
func (h *CalendarHandler) isMeeting(title, description, location string, attendees []string) bool {
	// Has multiple attendees (most reliable indicator)
	if len(attendees) > 1 {
		return true
	}

	// Check for meeting-related keywords in title
	meetingKeywords := []string{
		"meeting", "call", "standup", "sync", "review", "interview",
		"discussion", "conference", "session", "catch up", "check in",
		"demo", "presentation", "workshop", "training", "scrum",
		"retrospective", "planning", "1:1", "one-on-one",
	}

	titleLower := strings.ToLower(title)
	for _, keyword := range meetingKeywords {
		if strings.Contains(titleLower, keyword) {
			return true
		}
	}

	// Check for video meeting links
	meetingLinkPatterns := []string{
		"zoom.us", "teams.microsoft.com", "meet.google.com",
		"webex.com", "gotomeeting.com", "join.me",
		"whereby.com", "discord.gg", "bluejeans.com",
	}

	combinedText := strings.ToLower(description + " " + location)
	for _, pattern := range meetingLinkPatterns {
		if strings.Contains(combinedText, pattern) {
			return true
		}
	}

	return false
}