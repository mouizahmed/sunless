package worker

import (
	"context"
	"fmt"
	"log"

	"github.com/mouizahmed/justscribe-backend/internal/chunks"
	"github.com/mouizahmed/justscribe-backend/internal/memory"
	"github.com/mouizahmed/justscribe-backend/internal/models"
	"github.com/mouizahmed/justscribe-backend/internal/queue"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
	"github.com/mouizahmed/justscribe-backend/internal/retrieval"
	"golang.org/x/sync/semaphore"
)


// Worker drains the Redis queue and performs embedding + Pinecone upsert.
type Worker struct {
	queue          *queue.Queue
	embedder       *memory.Embedder
	pinecone       *retrieval.Client
	noteRepo       *repository.NoteRepository
	transcriptRepo *repository.TranscriptRepository
}

// NewWorker creates a new Worker.
func NewWorker(
	q *queue.Queue,
	e *memory.Embedder,
	p *retrieval.Client,
	noteRepo *repository.NoteRepository,
	transcriptRepo *repository.TranscriptRepository,
) *Worker {
	return &Worker{
		queue:          q,
		embedder:       e,
		pinecone:       p,
		noteRepo:       noteRepo,
		transcriptRepo: transcriptRepo,
	}
}

// Start runs the worker loop until ctx is cancelled.
func (w *Worker) Start(ctx context.Context) {
	if w.embedder == nil || w.pinecone == nil {
		log.Println("worker: embedder or pinecone not configured, worker disabled")
		return
	}

	log.Println("worker: started")
	sem := semaphore.NewWeighted(5)

	for {
		select {
		case <-ctx.Done():
			log.Println("worker: shutting down")
			return
		default:
		}

		job, err := w.queue.Dequeue(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("worker: dequeue error: %v", err)
			continue
		}
		if job == nil {
			continue // timeout, loop again
		}

		if err := sem.Acquire(ctx, 1); err != nil {
			return
		}

		go func(j queue.Job) {
			defer sem.Release(1)
			var processErr error
			switch j.Type {
			case queue.JobIndexNote:
				processErr = w.indexNote(ctx, j)
			case queue.JobIndexTranscript:
				processErr = w.indexTranscript(ctx, j)
			case queue.JobDeleteNote:
				processErr = w.deleteNote(ctx, j)
			default:
				log.Printf("worker: unknown job type: %s", j.Type)
			}
			if processErr != nil {
				log.Printf("worker: %s failed for %s: %v", j.Type, j.ID, processErr)
			}
		}(*job)
	}
}

func (w *Worker) indexNote(ctx context.Context, job queue.Job) error {
	note, err := w.noteRepo.GetNoteByID(job.UserID, job.ID)
	if err != nil {
		return fmt.Errorf("load note: %w", err)
	}

	// Delete existing vectors for this note
	_ = w.pinecone.DeleteByFilter(ctx, map[string]interface{}{
		"note_id": job.ID,
		"type":    "note",
	})

	cks := chunks.ChunkText(note.Title, note.NoteMarkdown, chunks.DefaultChunkSize)
	if len(cks) == 0 {
		return nil
	}

	texts := make([]string, len(cks))
	for i, c := range cks {
		texts[i] = c.Content
	}

	embeddings, err := w.embedder.EmbedBatch(ctx, texts)
	if err != nil {
		return fmt.Errorf("embed: %w", err)
	}

	vectors := make([]retrieval.Vector, len(cks))
	for i, c := range cks {
		vectors[i] = retrieval.Vector{
			ID:     fmt.Sprintf("note:%s:%d", job.ID, c.Index),
			Values: embeddings[i],
			Metadata: map[string]string{
				"user_id": job.UserID,
				"note_id": job.ID,
				"type":    "note",
				"content": c.Content,
			},
		}
	}

	return w.pinecone.Upsert(ctx, vectors)
}

func (w *Worker) indexTranscript(ctx context.Context, job queue.Job) error {
	segmentPtrs, err := w.transcriptRepo.GetSegmentsByNote(job.ID, job.UserID)
	if err != nil {
		return fmt.Errorf("load segments: %w", err)
	}

	// Delete existing transcript vectors for this note
	_ = w.pinecone.DeleteByFilter(ctx, map[string]interface{}{
		"note_id": job.ID,
		"type":    "transcript",
	})

	if len(segmentPtrs) == 0 {
		return nil
	}

	// Convert []*TranscriptSegment to []TranscriptSegment
	segments := make([]models.TranscriptSegment, len(segmentPtrs))
	for i, s := range segmentPtrs {
		segments[i] = *s
	}

	cks := chunks.ChunkSegments(segments, chunks.DefaultChunkSize)
	if len(cks) == 0 {
		return nil
	}

	texts := make([]string, len(cks))
	for i, c := range cks {
		texts[i] = c.Content
	}

	embeddings, err := w.embedder.EmbedBatch(ctx, texts)
	if err != nil {
		return fmt.Errorf("embed: %w", err)
	}

	vectors := make([]retrieval.Vector, len(cks))
	for i, c := range cks {
		vectors[i] = retrieval.Vector{
			ID:     fmt.Sprintf("transcript:%s:%d", job.ID, c.Index),
			Values: embeddings[i],
			Metadata: map[string]string{
				"user_id": job.UserID,
				"note_id": job.ID,
				"type":    "transcript",
				"content": c.Content,
			},
		}
	}

	return w.pinecone.Upsert(ctx, vectors)
}


func (w *Worker) deleteNote(ctx context.Context, job queue.Job) error {
	return w.pinecone.DeleteByFilter(ctx, map[string]interface{}{
		"note_id": job.ID,
	})
}
