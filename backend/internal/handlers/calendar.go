package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"

	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type CalendarHandler struct {
	oauthTokenRepo repository.OAuthTokenRepository
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
		oauthTokenRepo: oauthTokenRepo,
	}
}

func (h *CalendarHandler) GetUpcomingEvents(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

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
	tokens, err := h.oauthTokenRepo.GetByUser(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get OAuth tokens: %w", err)
	}

	if len(tokens) == 0 {
		return []*CalendarEvent{}, nil
	}

	var allEvents []*CalendarEvent
	for _, token := range tokens {
		if token.Provider != "google" {
			continue
		}

		if token.ExpiresAt != nil && time.Now().After(*token.ExpiresAt) {
			if err := h.refreshTokenIfNeeded(userID, token.Provider); err != nil {
				continue
			}

			refreshedToken, err := h.oauthTokenRepo.GetByUserAndProvider(userID, token.Provider)
			if err != nil {
				continue
			}
			token = refreshedToken
		}

		events, err := h.getGoogleCalendarEvents(token, limit)
		if err != nil {
			continue
		}

		allEvents = append(allEvents, events...)
	}

	sortEventsByStart(allEvents)

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

	if provider != "google" {
		return fmt.Errorf("unsupported provider: %s", provider)
	}

	oauthToken := &oauth2.Token{
		AccessToken:  token.AccessToken,
		RefreshToken: *token.RefreshToken,
		TokenType:    "Bearer",
	}
	if token.ExpiresAt != nil {
		oauthToken.Expiry = *token.ExpiresAt
	}

	config := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Endpoint: oauth2.Endpoint{
			TokenURL: "https://oauth2.googleapis.com/token",
		},
	}

	newToken, err := config.TokenSource(context.Background(), oauthToken).Token()
	if err != nil {
		return fmt.Errorf("failed to refresh token: %w", err)
	}

	updates := &models.UpdateOAuthTokenRequest{
		AccessToken: &newToken.AccessToken,
	}

	if newToken.RefreshToken != "" {
		updates.RefreshToken = &newToken.RefreshToken
	}

	if !newToken.Expiry.IsZero() {
		updates.ExpiresAt = &newToken.Expiry
	}

	if err := h.oauthTokenRepo.Update(userID, provider, updates); err != nil {
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

		if item.Organizer.DisplayName != "" {
			event.Organizer = item.Organizer.DisplayName
		} else if item.Organizer.Email != "" {
			event.Organizer = item.Organizer.Email
		}

		var attendees []string
		for _, attendee := range item.Attendees {
			if attendee.DisplayName != "" {
				attendees = append(attendees, attendee.DisplayName)
			} else if attendee.Email != "" {
				attendees = append(attendees, attendee.Email)
			}
		}
		event.Attendees = attendees

		if item.Start.DateTime != "" {
			if startTime, err := time.Parse(time.RFC3339, item.Start.DateTime); err == nil {
				event.Start = startTime
			}
		} else if item.Start.Date != "" {
			if startTime, err := time.Parse("2006-01-02", item.Start.Date); err == nil {
				event.Start = startTime
			}
		}

		if item.End.DateTime != "" {
			if endTime, err := time.Parse(time.RFC3339, item.End.DateTime); err == nil {
				event.End = endTime
			}
		} else if item.End.Date != "" {
			if endTime, err := time.Parse("2006-01-02", item.End.Date); err == nil {
				event.End = endTime
			}
		}

		event.IsMeeting = h.isMeeting(event.Title, event.Description, event.Location, event.Attendees)

		events = append(events, event)
	}

	return events, nil
}

func (h *CalendarHandler) isMeeting(title, description, location string, attendees []string) bool {
	if len(attendees) > 1 {
		return true
	}

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

	meetingLinkPatterns := []string{
		"zoom.us", "meet.google.com", "webex.com",
		"gotomeeting.com", "join.me", "whereby.com",
		"discord.gg", "bluejeans.com",
	}

	combinedText := strings.ToLower(description + " " + location)
	for _, pattern := range meetingLinkPatterns {
		if strings.Contains(combinedText, pattern) {
			return true
		}
	}

	return false
}

func sortEventsByStart(events []*CalendarEvent) {
	sort.SliceStable(events, func(i, j int) bool {
		return events[i].Start.Before(events[j].Start)
	})
}
