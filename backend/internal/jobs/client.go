package jobs

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

type Client struct {
	client *asynq.Client
}

const (
	URL_EXTRACT_JOB    = "url:extract"
	URL_QUEUE          = "url"
	TRANSCRIPTION_JOB  = "transcription:process"
	TRANSCRIPTION_QUEUE = "transcription"
)

type URLExtractPayload struct {
	URL    string `json:"url"`
	FileID string `json:"file_id"`
	UserID string `json:"user_id"`
}

type TranscriptionPayload struct {
	TranscriptionID string                   `json:"transcription_id"`
	FileID          string                   `json:"file_id"`
	UserID          string                   `json:"user_id"`
	GlossaryID      *string                  `json:"glossary_id,omitempty"`
	LanguageCode    *string                  `json:"language_code,omitempty"`
	Model           string                   `json:"model"`
	Settings        TranscriptionJobSettings `json:"settings"`
}

type TranscriptionJobSettings struct {
	SpeakerDetection bool `json:"speaker_detection"`
	FillerDetection  bool `json:"filler_detection"`
}

func NewClient(redisAddr, password string) *Client {
	client := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: password,
	})
	return &Client{client: client}
}

func (c *Client) Close() error {
	return c.client.Close()
}

func (c *Client) EnqueueURLExtract(url, fileID, userID string) error {
	payload := URLExtractPayload{
		URL:    url,
		FileID: fileID,
		UserID: userID,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	task := asynq.NewTask(URL_EXTRACT_JOB, payloadBytes)

	_, err = c.client.Enqueue(task,
		asynq.MaxRetry(3),
		asynq.Timeout(10*time.Minute),
		asynq.Queue(URL_QUEUE),
	)

	if err != nil {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}

	return nil
}

func (c *Client) EnqueueTranscription(payload TranscriptionPayload) error {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal transcription payload: %w", err)
	}

	task := asynq.NewTask(TRANSCRIPTION_JOB, payloadBytes)

	_, err = c.client.Enqueue(task,
		asynq.MaxRetry(3),
		asynq.Timeout(30*time.Minute), // Transcription can take longer
		asynq.Queue(TRANSCRIPTION_QUEUE),
	)

	if err != nil {
		return fmt.Errorf("failed to enqueue transcription task: %w", err)
	}

	return nil
}
