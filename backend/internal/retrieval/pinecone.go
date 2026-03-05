package retrieval

import (
	"context"
	"fmt"
	"os"

	"github.com/pinecone-io/go-pinecone/v3/pinecone"
	"google.golang.org/protobuf/types/known/structpb"
)

// Vector represents a vector to upsert into Pinecone.
type Vector struct {
	ID       string
	Values   []float32
	Metadata map[string]string
}

// Match represents a query result from Pinecone.
type Match struct {
	Score   float32
	Content string
	Type    string // "note" | "transcript"
	Title   string
	NoteID  string
}

// Client wraps a Pinecone index connection.
type Client struct {
	idx *pinecone.IndexConnection
}

// NewClient creates a Pinecone client. Returns nil, nil if env vars are missing.
func NewClient(ctx context.Context) (*Client, error) {
	apiKey := os.Getenv("PINECONE_API_KEY")
	host := os.Getenv("PINECONE_HOST")
	if apiKey == "" || host == "" {
		return nil, nil
	}

	pc, err := pinecone.NewClient(pinecone.NewClientParams{ApiKey: apiKey})
	if err != nil {
		return nil, fmt.Errorf("pinecone client: %w", err)
	}

	idx, err := pc.Index(pinecone.NewIndexConnParams{Host: host})
	if err != nil {
		return nil, fmt.Errorf("pinecone index: %w", err)
	}

	return &Client{idx: idx}, nil
}

// Upsert inserts or updates vectors in Pinecone.
func (c *Client) Upsert(ctx context.Context, vectors []Vector) error {
	if len(vectors) == 0 {
		return nil
	}

	pvecs := make([]*pinecone.Vector, len(vectors))
	for i, v := range vectors {
		md, err := structpb.NewStruct(stringMapToInterface(v.Metadata))
		if err != nil {
			return fmt.Errorf("metadata conversion: %w", err)
		}
		vals := v.Values
		pvecs[i] = &pinecone.Vector{
			Id:       v.ID,
			Values:   &vals,
			Metadata: md,
		}
	}

	// Upsert in batches of 100
	for start := 0; start < len(pvecs); start += 100 {
		end := start + 100
		if end > len(pvecs) {
			end = len(pvecs)
		}
		_, err := c.idx.UpsertVectors(ctx, pvecs[start:end])
		if err != nil {
			return fmt.Errorf("upsert batch: %w", err)
		}
	}

	return nil
}

// Query searches Pinecone for similar vectors.
func (c *Client) Query(ctx context.Context, embedding []float32, filter map[string]interface{}, topK int) ([]Match, error) {
	if topK <= 0 {
		topK = 6
	}

	req := &pinecone.QueryByVectorValuesRequest{
		Vector:          embedding,
		TopK:            uint32(topK),
		IncludeMetadata: true,
	}

	if len(filter) > 0 {
		f, err := structpb.NewStruct(filter)
		if err != nil {
			return nil, fmt.Errorf("filter conversion: %w", err)
		}
		req.MetadataFilter = f
	}

	resp, err := c.idx.QueryByVectorValues(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("pinecone query: %w", err)
	}

	matches := make([]Match, 0, len(resp.Matches))
	for _, m := range resp.Matches {
		if m.Vector == nil || m.Vector.Metadata == nil {
			continue
		}
		md := m.Vector.Metadata.AsMap()
		matches = append(matches, Match{
			Score:   m.Score,
			Content: stringFromMD(md, "content"),
			Type:    stringFromMD(md, "type"),
			Title:   stringFromMD(md, "title"),
			NoteID:  stringFromMD(md, "note_id"),
		})
	}
	return matches, nil
}

// DeleteByFilter deletes vectors matching the given metadata filter.
func (c *Client) DeleteByFilter(ctx context.Context, filter map[string]interface{}) error {
	f, err := structpb.NewStruct(filter)
	if err != nil {
		return fmt.Errorf("filter conversion: %w", err)
	}
	return c.idx.DeleteVectorsByFilter(ctx, f)
}

func stringMapToInterface(m map[string]string) map[string]interface{} {
	result := make(map[string]interface{}, len(m))
	for k, v := range m {
		result[k] = v
	}
	return result
}

func stringFromMD(md map[string]interface{}, key string) string {
	if v, ok := md[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
