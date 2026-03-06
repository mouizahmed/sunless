package chunks

import (
	"html"
	"strings"

	"github.com/mouizahmed/justscribe-backend/internal/models"
)

const (
	DefaultChunkSize = 800
	MaxChunkSize     = 1200
)

type Chunk struct {
	Index   int
	Content string
}

// ChunkText splits markdown text into chunks of maxChars.
// Strategy: split on \n\n (paragraphs); if a paragraph > maxChars, split on \n.
func ChunkText(text string, maxChars int) []Chunk {
	if maxChars <= 0 {
		maxChars = DefaultChunkSize
	}
	text = html.UnescapeString(strings.TrimSpace(text))
	if text == "" {
		return nil
	}

	paragraphs := strings.Split(text, "\n\n")

	var pieces []string
	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if len(p) <= maxChars {
			pieces = append(pieces, p)
		} else {
			// Split long paragraphs on newline
			lines := strings.Split(p, "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line != "" {
					pieces = append(pieces, line)
				}
			}
		}
	}

	if len(pieces) == 0 {
		return nil
	}

	var chunks []Chunk
	var current strings.Builder
	for _, piece := range pieces {
		if current.Len() > 0 && current.Len()+len(piece)+2 > maxChars {
			chunks = append(chunks, Chunk{Index: len(chunks), Content: current.String()})
			current.Reset()
		}
		if current.Len() > 0 {
			current.WriteString("\n\n")
		}
		current.WriteString(piece)
	}
	if current.Len() > 0 {
		chunks = append(chunks, Chunk{Index: len(chunks), Content: current.String()})
	}

	return chunks
}

// ChunkSegments groups TranscriptSegments into chunks of maxChars.
// Preserves segment order; joins with " " separator.
func ChunkSegments(segments []models.TranscriptSegment, maxChars int) []Chunk {
	if maxChars <= 0 {
		maxChars = DefaultChunkSize
	}
	if len(segments) == 0 {
		return nil
	}

	var chunks []Chunk
	var current strings.Builder
	for _, seg := range segments {
		text := strings.TrimSpace(seg.Text)
		if text == "" {
			continue
		}
		if current.Len() > 0 && current.Len()+len(text)+1 > maxChars {
			chunks = append(chunks, Chunk{Index: len(chunks), Content: current.String()})
			current.Reset()
		}
		if current.Len() > 0 {
			current.WriteString(" ")
		}
		current.WriteString(text)
	}
	if current.Len() > 0 {
		chunks = append(chunks, Chunk{Index: len(chunks), Content: current.String()})
	}

	return chunks
}
