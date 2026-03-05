package memory

import (
	"context"
	"fmt"
	"os"

	openai "github.com/sashabaranov/go-openai"
)

const embeddingModel = openai.SmallEmbedding3

// Embedder wraps the OpenAI embeddings API (direct, not via OpenRouter).
type Embedder struct {
	client *openai.Client
	model  openai.EmbeddingModel
}

// NewEmbedder creates an Embedder using OPENAI_API_KEY.
// Returns nil, nil if the key is not set (graceful degradation).
func NewEmbedder() (*Embedder, error) {
	key := os.Getenv("OPENAI_API_KEY")
	if key == "" {
		return nil, nil
	}
	client := openai.NewClient(key)
	return &Embedder{client: client, model: embeddingModel}, nil
}

// Embed embeds a single string.
func (e *Embedder) Embed(ctx context.Context, text string) ([]float32, error) {
	resp, err := e.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Model: e.model,
		Input: []string{text},
	})
	if err != nil {
		return nil, fmt.Errorf("embedding failed: %w", err)
	}
	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	return resp.Data[0].Embedding, nil
}

// EmbedBatch embeds multiple strings in one API call.
func (e *Embedder) EmbedBatch(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}
	resp, err := e.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Model: e.model,
		Input: texts,
	})
	if err != nil {
		return nil, fmt.Errorf("batch embedding failed: %w", err)
	}
	result := make([][]float32, len(texts))
	for _, d := range resp.Data {
		if d.Index >= 0 && d.Index < len(result) {
			result[d.Index] = d.Embedding
		}
	}
	return result, nil
}
