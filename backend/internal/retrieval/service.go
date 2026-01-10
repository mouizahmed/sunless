package retrieval

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/mouizahmed/justscribe-backend/internal/models"
	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/packages/param"
	"github.com/pinecone-io/go-pinecone/v3/pinecone"
	"google.golang.org/protobuf/types/known/structpb"
)

const defaultMinScore = 0.3

type RetrievalService struct {
	openaiClient   *openai.Client
	memoriesIndex  *pinecone.IndexConnection
	chunksIndex    *pinecone.IndexConnection
	documentsIndex *pinecone.IndexConnection
	topK           uint32
	embedModel     openai.EmbeddingModel
	embedDims      int64
	minScore       float32
}

type MemoryMatch struct {
	MemoryID   string
	Score      float32
	Importance int
}

type ChunkPayload struct {
	ChunkID        string
	UserID         string
	SessionID      string
	StartMessageID string
	EndMessageID   string
	MessageIDs     []string
	Summary        string
	VectorText     string
	CreatedAt      time.Time
}

type ChunkMatch struct {
	ChunkID      string
	Summary      string
	MessageIDs   []string
	StartMessage string
	EndMessage   string
	Score        float32
}

func NewRetrievalService(openaiClient *openai.Client) (*RetrievalService, error) {
	apiKey := strings.TrimSpace(os.Getenv("PINECONE_API_KEY"))
	if apiKey == "" {
		return nil, nil
	}

	client, err := pinecone.NewClient(pinecone.NewClientParams{
		ApiKey:    apiKey,
		SourceTag: "sunless-backend",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create pinecone client: %w", err)
	}

	memoriesHost := strings.TrimSpace(os.Getenv("PINECONE_MEMORIES_HOST"))
	memoriesNamespace := strings.TrimSpace(os.Getenv("PINECONE_MEMORIES_NAMESPACE"))
	chunksHost := strings.TrimSpace(os.Getenv("PINECONE_CHUNKS_HOST"))
	chunksNamespace := strings.TrimSpace(os.Getenv("PINECONE_CHUNKS_NAMESPACE"))
	documentsHost := strings.TrimSpace(os.Getenv("PINECONE_DOCUMENTS_HOST"))
	documentsNamespace := strings.TrimSpace(os.Getenv("PINECONE_DOCUMENTS_NAMESPACE"))

	memoriesIndex, err := connectIndex(client, memoriesHost, memoriesNamespace)
	if err != nil {
		return nil, err
	}
	chunksIndex, err := connectIndex(client, chunksHost, chunksNamespace)
	if err != nil {
		return nil, err
	}
	documentsIndex, err := connectIndex(client, documentsHost, documentsNamespace)
	if err != nil {
		return nil, err
	}

	if memoriesIndex == nil {
		legacyHost := strings.TrimSpace(os.Getenv("PINECONE_INDEX_HOST"))
		legacyNamespace := strings.TrimSpace(os.Getenv("PINECONE_NAMESPACE"))
		memoriesIndex, err = connectIndex(client, legacyHost, legacyNamespace)
		if err != nil {
			return nil, err
		}
	}

	topK := uint32(8)
	if raw := strings.TrimSpace(os.Getenv("PINECONE_TOP_K")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			topK = uint32(n)
		}
	}

	embedModel := parseEmbeddingModel(strings.TrimSpace(os.Getenv("PINECONE_EMBED_MODEL")))
	embedDims := defaultEmbeddingDims(embedModel)
	if raw := strings.TrimSpace(os.Getenv("PINECONE_EMBED_DIM")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			embedDims = int64(n)
		}
	}

	minScore := float32(defaultMinScore)
	if raw := strings.TrimSpace(os.Getenv("PINECONE_MIN_SCORE")); raw != "" {
		if f, err := strconv.ParseFloat(raw, 32); err == nil && f > 0 && f <= 1.0 {
			minScore = float32(f)
		}
	}

	return &RetrievalService{
		openaiClient:   openaiClient,
		memoriesIndex:  memoriesIndex,
		chunksIndex:    chunksIndex,
		documentsIndex: documentsIndex,
		topK:           topK,
		embedModel:     embedModel,
		embedDims:      embedDims,
		minScore:       minScore,
	}, nil
}

func connectIndex(client *pinecone.Client, host, namespace string) (*pinecone.IndexConnection, error) {
	host = strings.TrimSpace(host)
	if host == "" {
		return nil, nil
	}

	params := pinecone.NewIndexConnParams{
		Host: host,
	}
	if ns := strings.TrimSpace(namespace); ns != "" {
		params.Namespace = ns
	}

	indexConn, err := client.Index(params)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to pinecone index %s: %w", host, err)
	}
	return indexConn, nil
}

func (s *RetrievalService) UpsertMemoryEmbedding(ctx context.Context, memory *models.Memory) (string, error) {
	if s == nil || s.memoriesIndex == nil || s.openaiClient == nil || memory == nil {
		return "", nil
	}

	summary := strings.TrimSpace(memory.Summary)
	if summary == "" {
		return "", nil
	}

	embedding, err := s.createEmbedding(ctx, summary)
	if err != nil {
		return "", fmt.Errorf("failed to create memory embedding: %w", err)
	}

	meta := map[string]interface{}{
		"memory_id":  memory.ID,
		"user_id":    memory.UserID,
		"importance": memory.Importance,
		"created_at": memory.CreatedAt.Format(time.RFC3339Nano),
	}
	if memory.SessionID != nil {
		meta["session_id"] = *memory.SessionID
	}
	metadata, err := structpb.NewStruct(meta)
	if err != nil {
		return "", fmt.Errorf("failed to encode memory metadata: %w", err)
	}

	vectorID := memory.ID
	vecValues := embedding
	vectors := []*pinecone.Vector{
		{
			Id:       vectorID,
			Values:   &vecValues,
			Metadata: metadata,
		},
	}

	if _, err := s.memoriesIndex.UpsertVectors(ctx, vectors); err != nil {
		return "", fmt.Errorf("failed to upsert memory vector: %w", err)
	}

	return vectorID, nil
}

func (s *RetrievalService) UpsertChunkEmbedding(ctx context.Context, chunk ChunkPayload) error {
	if s == nil || s.chunksIndex == nil || s.openaiClient == nil {
		return nil
	}
	text := strings.TrimSpace(chunk.VectorText)
	if text == "" {
		return fmt.Errorf("chunk embedding text is empty")
	}

	embedding, err := s.createEmbedding(ctx, text)
	if err != nil {
		return fmt.Errorf("failed to embed chunk: %w", err)
	}

	metaMap := map[string]interface{}{
		"chunk_id":         chunk.ChunkID,
		"type":             "chunk",
		"user_id":          chunk.UserID,
		"session_id":       chunk.SessionID,
		"summary":          chunk.Summary,
		"start_message_id": chunk.StartMessageID,
		"end_message_id":   chunk.EndMessageID,
		"created_at":       chunk.CreatedAt.Format(time.RFC3339Nano),
	}
	if len(chunk.MessageIDs) > 0 {
		interfaceIDs := make([]interface{}, 0, len(chunk.MessageIDs))
		for _, id := range chunk.MessageIDs {
			interfaceIDs = append(interfaceIDs, id)
		}
		metaMap["message_ids"] = interfaceIDs
	}

	metadata, err := structpb.NewStruct(metaMap)
	if err != nil {
		return fmt.Errorf("failed to encode chunk metadata: %w", err)
	}

	vectorID := chunk.ChunkID
	values := embedding
	vectors := []*pinecone.Vector{
		{
			Id:       vectorID,
			Values:   &values,
			Metadata: metadata,
		},
	}

	if _, err := s.chunksIndex.UpsertVectors(ctx, vectors); err != nil {
		return fmt.Errorf("failed to upsert chunk vector: %w", err)
	}

	return nil
}

func (s *RetrievalService) QueryMemories(ctx context.Context, userID, query string, topK int) ([]MemoryMatch, error) {
	if s == nil || s.memoriesIndex == nil || s.openaiClient == nil {
		return nil, nil
	}

	query = strings.TrimSpace(query)
	if query == "" {
		return nil, nil
	}

	if topK <= 0 {
		topK = int(s.topK)
	}

	embedding, err := s.createEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to embed retrieval query: %w", err)
	}

	filterMap := map[string]interface{}{
		"user_id": userID,
	}
	filter, err := structpb.NewStruct(filterMap)
	if err != nil {
		return nil, fmt.Errorf("failed to build pinecone filter: %w", err)
	}

	resp, err := s.memoriesIndex.QueryByVectorValues(ctx, &pinecone.QueryByVectorValuesRequest{
		Vector:          embedding,
		TopK:            uint32(topK),
		MetadataFilter:  filter,
		IncludeMetadata: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query pinecone memories index: %w", err)
	}

	matches := make([]MemoryMatch, 0, len(resp.Matches))
	for _, match := range resp.Matches {
		if match == nil || match.Vector == nil || match.Vector.Metadata == nil {
			continue
		}
		if match.Score < s.minScore {
			continue
		}

		fields := match.Vector.Metadata.Fields
		memoryID := metadataString(fields, "memory_id")
		if memoryID == "" {
			continue
		}

		rawImportance := metadataNumber(fields, "importance")
		importance := int(rawImportance)
		if importance <= 0 {
			importance = 1
		}

		matches = append(matches, MemoryMatch{
			MemoryID:   memoryID,
			Score:      match.Score,
			Importance: importance,
		})
	}

	return matches, nil
}

func (s *RetrievalService) QueryChunks(ctx context.Context, userID, sessionID, query string, topK int) ([]ChunkMatch, error) {
	if s == nil || s.chunksIndex == nil || s.openaiClient == nil {
		return nil, nil
	}

	query = strings.TrimSpace(query)
	if query == "" {
		return nil, nil
	}

	if topK <= 0 {
		topK = int(s.topK)
	}

	embedding, err := s.createEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to embed chunk query: %w", err)
	}

	filterMap := map[string]interface{}{
		"user_id":    userID,
		"session_id": sessionID,
	}

	filter, err := structpb.NewStruct(filterMap)
	if err != nil {
		return nil, fmt.Errorf("failed to build chunk filter: %w", err)
	}

	resp, err := s.chunksIndex.QueryByVectorValues(ctx, &pinecone.QueryByVectorValuesRequest{
		Vector:          embedding,
		TopK:            uint32(topK),
		MetadataFilter:  filter,
		IncludeMetadata: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query chunk index: %w", err)
	}

	results := make([]ChunkMatch, 0, len(resp.Matches))
	for _, match := range resp.Matches {
		if match == nil || match.Vector == nil || match.Vector.Metadata == nil {
			continue
		}
		if match.Score < s.minScore {
			continue
		}

		fields := match.Vector.Metadata.Fields
		summary := metadataString(fields, "summary")
		if summary == "" {
			continue
		}

		results = append(results, ChunkMatch{
			ChunkID:      metadataString(fields, "chunk_id"),
			Summary:      summary,
			MessageIDs:   metadataStringList(fields, "message_ids"),
			StartMessage: metadataString(fields, "start_message_id"),
			EndMessage:   metadataString(fields, "end_message_id"),
			Score:        match.Score,
		})
	}

	return results, nil
}

func (s *RetrievalService) createEmbeddings(ctx context.Context, inputs []string) ([][]float32, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("no inputs provided")
	}

	params := openai.EmbeddingNewParams{
		Model: s.embedModel,
	}
	if len(inputs) == 1 {
		params.Input.OfString = param.NewOpt(inputs[0])
	} else {
		params.Input.OfArrayOfStrings = inputs
	}
	if s.embedDims > 0 {
		params.Dimensions = param.NewOpt(s.embedDims)
	}

	res, err := s.openaiClient.Embeddings.New(ctx, params)
	if err != nil {
		return nil, err
	}

	if len(res.Data) == 0 {
		return nil, fmt.Errorf("no embedding data returned")
	}

	embeddings := make([][]float32, len(res.Data))
	for i, item := range res.Data {
		emb := make([]float32, len(item.Embedding))
		for j, v := range item.Embedding {
			emb[j] = float32(v)
		}
		embeddings[i] = emb
	}

	return embeddings, nil
}

func (s *RetrievalService) createEmbedding(ctx context.Context, text string) ([]float32, error) {
	vecs, err := s.createEmbeddings(ctx, []string{text})
	if err != nil {
		return nil, err
	}
	if len(vecs) == 0 {
		return nil, fmt.Errorf("no embedding data returned")
	}
	return vecs[0], nil
}

func metadataString(fields map[string]*structpb.Value, key string) string {
	if fields == nil {
		return ""
	}
	if v, ok := fields[key]; ok {
		return v.GetStringValue()
	}
	return ""
}

func metadataNumber(fields map[string]*structpb.Value, key string) float64 {
	if fields == nil {
		return 0
	}
	if v, ok := fields[key]; ok {
		return v.GetNumberValue()
	}
	return 0
}

func metadataStringList(fields map[string]*structpb.Value, key string) []string {
	if fields == nil {
		return nil
	}
	value, ok := fields[key]
	if !ok || value.GetListValue() == nil {
		return nil
	}
	list := value.GetListValue().Values
	result := make([]string, 0, len(list))
	for _, item := range list {
		if s := item.GetStringValue(); s != "" {
			result = append(result, s)
		}
	}
	return result
}

func parseEmbeddingModel(name string) openai.EmbeddingModel {
	switch strings.ToLower(name) {
	case "text-embedding-3-large":
		return openai.EmbeddingModelTextEmbedding3Large
	case "text-embedding-ada-002":
		return openai.EmbeddingModelTextEmbeddingAda002
	case "":
		return openai.EmbeddingModelTextEmbedding3Small
	default:
		return openai.EmbeddingModel(name)
	}
}

func defaultEmbeddingDims(model openai.EmbeddingModel) int64 {
	switch model {
	case openai.EmbeddingModelTextEmbedding3Large:
		return 3072
	case openai.EmbeddingModelTextEmbedding3Small:
		return 1536
	case openai.EmbeddingModelTextEmbeddingAda002:
		return 1536
	default:
		return 0
	}
}
