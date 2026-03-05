package retrieval

import (
	"context"
	"fmt"
	"strings"

	"github.com/mouizahmed/justscribe-backend/internal/memory"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

const smallNoteThreshold = 12000

// Scope controls the retrieval filter.
type Scope struct {
	NoteID string // empty = global (all user content)
}

// Retriever provides high-level semantic retrieval.
type Retriever struct {
	embedder *memory.Embedder
	pinecone *Client
	noteRepo *repository.NoteRepository
}

// NewRetriever creates a Retriever. Accepts nil embedder/pinecone for graceful degradation.
func NewRetriever(embedder *memory.Embedder, pinecone *Client, noteRepo *repository.NoteRepository) *Retriever {
	return &Retriever{
		embedder: embedder,
		pinecone: pinecone,
		noteRepo: noteRepo,
	}
}

// RetrieveContext returns a formatted context block to inject into the system prompt.
// Returns "" if embedder or pinecone is nil.
func (r *Retriever) RetrieveContext(ctx context.Context, userID, query string, scope Scope, topK int) (string, error) {
	if r.embedder == nil || r.pinecone == nil {
		return "", nil
	}

	// Note-scoped: if note is small enough, return it directly
	if scope.NoteID != "" {
		note, err := r.noteRepo.GetNoteByID(userID, scope.NoteID)
		if err == nil && len(note.NoteMarkdown) < smallNoteThreshold {
			return fmt.Sprintf("[Full note content for context:]\n%s", note.NoteMarkdown), nil
		}
	}

	// Embed the query
	embedding, err := r.embedder.Embed(ctx, query)
	if err != nil {
		return "", fmt.Errorf("embed query: %w", err)
	}

	// Build filter
	filter := map[string]interface{}{
		"user_id": userID,
	}
	if scope.NoteID != "" {
		filter["note_id"] = scope.NoteID
	}

	matches, err := r.pinecone.Query(ctx, embedding, filter, topK)
	if err != nil {
		return "", fmt.Errorf("pinecone query: %w", err)
	}

	if len(matches) == 0 {
		return "", nil
	}

	var b strings.Builder
	b.WriteString("[Relevant context retrieved from your notes and transcripts:]")
	for i, m := range matches {
		b.WriteString(fmt.Sprintf("\n[%d] (%s) \"%s\"", i+1, m.Type, m.Content))
	}

	return b.String(), nil
}
