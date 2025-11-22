package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	client *redis.Client
}

func NewClient(addr, password string, db int) *Client {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	return &Client{client: client}
}

func (c *Client) Close() error {
	return c.client.Close()
}

func (c *Client) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

func (c *Client) SetURLProgress(ctx context.Context, fileID string, progress int) error {
	key := fmt.Sprintf("url_progress:%s", fileID)
	return c.client.Set(ctx, key, progress, 30*time.Minute).Err()
}

func (c *Client) GetURLProgress(ctx context.Context, fileID string) (int, error) {
	key := fmt.Sprintf("url_progress:%s", fileID)
	result, err := c.client.Get(ctx, key).Int()
	if err == redis.Nil {
		return 0, nil // Not found, return 0 progress
	}
	return result, err
}

// SetURLResult caches URL extraction result
func (c *Client) SetURLResult(ctx context.Context, fileID string, result interface{}) error {
	key := fmt.Sprintf("url_result:%s", fileID)

	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal result: %w", err)
	}

	return c.client.Set(ctx, key, data, 1*time.Hour).Err()
}

// GetURLResult gets cached URL extraction result
func (c *Client) GetURLResult(ctx context.Context, fileID string, result interface{}) error {
	key := fmt.Sprintf("url_result:%s", fileID)

	data, err := c.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(data), result)
}

// PublishURLUpdate publishes real-time URL extraction updates
func (c *Client) PublishURLUpdate(ctx context.Context, fileID string, update interface{}) error {
	channel := fmt.Sprintf("url_updates:%s", fileID)

	data, err := json.Marshal(update)
	if err != nil {
		return fmt.Errorf("failed to marshal update: %w", err)
	}

	return c.client.Publish(ctx, channel, data).Err()
}
