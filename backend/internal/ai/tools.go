package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/mouizahmed/justscribe-backend/internal/database"
	"github.com/mouizahmed/justscribe-backend/internal/repository"
)

type ToolExecutor struct {
	noteRepo       *repository.NoteRepository
	transcriptRepo *repository.TranscriptRepository
	folderRepo     *repository.FolderRepository
	db             *database.DB
}

func NewToolExecutor(noteRepo *repository.NoteRepository, transcriptRepo *repository.TranscriptRepository, folderRepo *repository.FolderRepository, db *database.DB) *ToolExecutor {
	return &ToolExecutor{
		noteRepo:       noteRepo,
		transcriptRepo: transcriptRepo,
		folderRepo:     folderRepo,
		db:             db,
	}
}

func (t *ToolExecutor) GetToolDefinitions() []ToolDefinition {
	return []ToolDefinition{
		// 1. search_notes
		{
			Name:        "search_notes",
			Description: "Search for notes by keyword in titles and content. Returns matching notes with excerpts.",
			Properties: map[string]interface{}{
				"query": map[string]interface{}{
					"type":        "string",
					"description": "Search keywords",
				},
				"folder_id": map[string]interface{}{
					"type":        "string",
					"description": "Optional folder ID to filter results",
				},
				"limit": map[string]interface{}{
					"type":        "integer",
					"description": "Maximum number of results (default 10)",
				},
			},
			Required: []string{"query"},
		},
		// 2. get_note
		{
			Name:        "get_note",
			Description: "Get full content of a note by title or ID. Use fuzzy title matching.",
			Properties: map[string]interface{}{
				"identifier": map[string]interface{}{
					"type":        "string",
					"description": "Note title (fuzzy match) or exact UUID",
				},
			},
			Required: []string{"identifier"},
		},
		// 3. list_notes
		{
			Name:        "list_notes",
			Description: "List notes with optional filters and sorting.",
			Properties: map[string]interface{}{
				"folder_id": map[string]interface{}{
					"type":        "string",
					"description": "Filter by folder ID",
				},
				"limit": map[string]interface{}{
					"type":        "integer",
					"description": "Maximum results (default 20)",
				},
				"sort": map[string]interface{}{
					"type":        "string",
					"description": "Sort by: created_at, updated_at, title (default: updated_at)",
				},
			},
			Required: []string{},
		},
		// 4. get_note_stats
		{
			Name:        "get_note_stats",
			Description: "Get statistics about the user's notes (total count, notes per folder, etc.)",
			Properties:  map[string]interface{}{},
			Required:    []string{},
		},
		// 5. search_transcripts
		{
			Name:        "search_transcripts",
			Description: "Search across all meeting transcripts for keywords.",
			Properties: map[string]interface{}{
				"query": map[string]interface{}{
					"type":        "string",
					"description": "Search keywords",
				},
				"limit": map[string]interface{}{
					"type":        "integer",
					"description": "Maximum results (default 20)",
				},
			},
			Required: []string{"query"},
		},
		// 6. get_transcript
		{
			Name:        "get_transcript",
			Description: "Get the full transcript for a specific note.",
			Properties: map[string]interface{}{
				"note_id": map[string]interface{}{
					"type":        "string",
					"description": "Note UUID",
				},
			},
			Required: []string{"note_id"},
		},
		// 7. list_folders
		{
			Name:        "list_folders",
			Description: "Get all folders with note counts.",
			Properties:  map[string]interface{}{},
			Required:    []string{},
		},
		// 8. get_folder_contents
		{
			Name:        "get_folder_contents",
			Description: "Get all notes in a specific folder.",
			Properties: map[string]interface{}{
				"folder_id": map[string]interface{}{
					"type":        "string",
					"description": "Folder UUID",
				},
			},
			Required: []string{"folder_id"},
		},
		// 9. get_notes_by_date
		{
			Name:        "get_notes_by_date",
			Description: "Find notes created in a date range.",
			Properties: map[string]interface{}{
				"start_date": map[string]interface{}{
					"type":        "string",
					"description": "Start date (YYYY-MM-DD)",
				},
				"end_date": map[string]interface{}{
					"type":        "string",
					"description": "End date (YYYY-MM-DD), optional",
				},
			},
			Required: []string{"start_date"},
		},
		// 10. get_recent_notes
		{
			Name:        "get_recent_notes",
			Description: "Get the most recently created or updated notes.",
			Properties: map[string]interface{}{
				"limit": map[string]interface{}{
					"type":        "integer",
					"description": "Maximum results (default 10)",
				},
			},
			Required: []string{},
		},
	}
}

func (t *ToolExecutor) Execute(ctx context.Context, userID, toolName string, input json.RawMessage) (string, error) {
	switch toolName {
	case "search_notes":
		return t.searchNotes(userID, input)
	case "get_note":
		return t.getNote(userID, input)
	case "list_notes":
		return t.listNotes(userID, input)
	case "get_note_stats":
		return t.getNoteStats(userID, input)
	case "search_transcripts":
		return t.searchTranscripts(userID, input)
	case "get_transcript":
		return t.getTranscript(userID, input)
	case "list_folders":
		return t.listFolders(userID, input)
	case "get_folder_contents":
		return t.getFolderContents(userID, input)
	case "get_notes_by_date":
		return t.getNotesByDate(userID, input)
	case "get_recent_notes":
		return t.getRecentNotes(userID, input)
	default:
		return "", fmt.Errorf("unknown tool: %s", toolName)
	}
}

// 1. search_notes - Search for notes by keyword
func (t *ToolExecutor) searchNotes(userID string, input json.RawMessage) (string, error) {
	var params struct {
		Query    string `json:"query"`
		FolderID string `json:"folder_id"`
		Limit    int    `json:"limit"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	if params.Limit == 0 {
		params.Limit = 10
	}

	var folderID *string
	if params.FolderID != "" {
		folderID = &params.FolderID
	}

	notes, err := t.noteRepo.SearchNotes(userID, params.Query, folderID, params.Limit, 0)
	if err != nil {
		return "", fmt.Errorf("search failed: %w", err)
	}

	if len(notes) == 0 {
		return "No notes found matching your search.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d note(s):\n\n", len(notes)))
	for _, note := range notes {
		result.WriteString(fmt.Sprintf("**%s** (id: %s)\n", note.Title, note.ID))
		result.WriteString(fmt.Sprintf("Created: %s\n", note.CreatedAt.Format("Jan 2, 2006")))
		excerpt := note.NoteMarkdown
		if len(excerpt) > 200 {
			excerpt = excerpt[:200] + "..."
		}
		if excerpt != "" {
			result.WriteString(fmt.Sprintf("Excerpt: %s\n", excerpt))
		}
		result.WriteString("\n")
	}
	return result.String(), nil
}

// 2. get_note - Get full note content by title or ID
func (t *ToolExecutor) getNote(userID string, input json.RawMessage) (string, error) {
	var params struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	// Try exact ID match first
	note, err := t.noteRepo.GetNoteByID(userID, params.Identifier)
	if err != nil {
		// Try fuzzy title search
		notes, searchErr := t.noteRepo.SearchNotes(userID, params.Identifier, nil, 1, 0)
		if searchErr != nil || len(notes) == 0 {
			return "Note not found.", nil
		}
		note = &notes[0]
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("# %s (id: %s)\n\n", note.Title, note.ID))
	result.WriteString(fmt.Sprintf("Created: %s\n", note.CreatedAt.Format("Jan 2, 2006 3:04 PM")))
	result.WriteString(fmt.Sprintf("Updated: %s\n\n", note.UpdatedAt.Format("Jan 2, 2006 3:04 PM")))

	if note.NoteMarkdown != "" {
		result.WriteString(note.NoteMarkdown)
	} else {
		result.WriteString("(empty note)")
	}

	return result.String(), nil
}

// 3. list_notes - List notes with filters and sorting
func (t *ToolExecutor) listNotes(userID string, input json.RawMessage) (string, error) {
	var params struct {
		FolderID string `json:"folder_id"`
		Limit    int    `json:"limit"`
		Sort     string `json:"sort"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	if params.Limit == 0 {
		params.Limit = 20
	}

	var folderID *string
	if params.FolderID != "" {
		folderID = &params.FolderID
	}
	notes, err := t.noteRepo.ListNotesByUserCursor(userID, folderID, false, params.Limit, nil, nil)
	if err != nil {
		return "", fmt.Errorf("list failed: %w", err)
	}

	if len(notes) == 0 {
		return "No notes found.", nil
	}

	// Apply sort
	switch params.Sort {
	case "title":
		sort.Slice(notes, func(i, j int) bool {
			return notes[i].Title < notes[j].Title
		})
	case "created_at":
		sort.Slice(notes, func(i, j int) bool {
			return notes[i].CreatedAt.After(notes[j].CreatedAt)
		})
	// default: already sorted by updated_at DESC from repo
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d note(s):\n\n", len(notes)))
	for _, note := range notes {
		result.WriteString(fmt.Sprintf("- **%s** (id: %s, %s)\n", note.Title, note.ID, note.CreatedAt.Format("Jan 2, 2006")))
	}
	return result.String(), nil
}

// 4. get_note_stats - Get statistics using SQL COUNT
func (t *ToolExecutor) getNoteStats(userID string, input json.RawMessage) (string, error) {
	folderCounts, total, err := t.noteRepo.CountNotesByFolderGrouped(userID)
	if err != nil {
		return "", fmt.Errorf("stats failed: %w", err)
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Total notes: %d\n\n", total))

	if len(folderCounts) > 0 {
		result.WriteString("Notes by folder:\n")
		for _, fc := range folderCounts {
			result.WriteString(fmt.Sprintf("- %s: %d\n", fc.Name, fc.Count))
		}
	}

	return result.String(), nil
}

// 5. search_transcripts - Search transcripts
func (t *ToolExecutor) searchTranscripts(userID string, input json.RawMessage) (string, error) {
	var params struct {
		Query string `json:"query"`
		Limit int    `json:"limit"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	if params.Limit == 0 {
		params.Limit = 20
	}

	segments, err := t.transcriptRepo.SearchSegments(userID, params.Query, params.Limit)
	if err != nil {
		return "", fmt.Errorf("search failed: %w", err)
	}

	if len(segments) == 0 {
		return "No transcript segments found matching your search.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d transcript segment(s):\n\n", len(segments)))
	for _, seg := range segments {
		speaker := "Speaker"
		if seg.Channel == 0 {
			speaker = "You"
		} else {
			speaker = fmt.Sprintf("Speaker %d", seg.Channel)
		}
		result.WriteString(fmt.Sprintf("[%s]: %s\n\n", speaker, seg.Text))
	}

	return result.String(), nil
}

// 6. get_transcript - Get full transcript for a note
func (t *ToolExecutor) getTranscript(userID string, input json.RawMessage) (string, error) {
	var params struct {
		NoteID string `json:"note_id"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	segments, err := t.transcriptRepo.GetSegmentsByNote(params.NoteID, userID)
	if err != nil {
		return "Transcript not found.", nil
	}

	if len(segments) == 0 {
		return "No transcript found for this note.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Transcript (%d segments):\n\n", len(segments)))
	for _, seg := range segments {
		speaker := "Speaker"
		if seg.Channel == 0 {
			speaker = "You"
		} else {
			speaker = fmt.Sprintf("Speaker %d", seg.Channel)
		}
		result.WriteString(fmt.Sprintf("[%s]: %s\n", speaker, seg.Text))
	}

	return result.String(), nil
}

// 7. list_folders - List all folders
func (t *ToolExecutor) listFolders(userID string, input json.RawMessage) (string, error) {
	folders, err := t.folderRepo.ListFolders(userID)
	if err != nil {
		return "", fmt.Errorf("list failed: %w", err)
	}

	if len(folders) == 0 {
		return "No folders found.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d folder(s):\n\n", len(folders)))
	for _, folder := range folders {
		result.WriteString(fmt.Sprintf("- **%s** (ID: %s)\n", folder.Name, folder.ID))
	}
	return result.String(), nil
}

// 8. get_folder_contents - Get notes in a folder
func (t *ToolExecutor) getFolderContents(userID string, input json.RawMessage) (string, error) {
	var params struct {
		FolderID string `json:"folder_id"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	folderID := params.FolderID
	notes, err := t.noteRepo.ListNotesByUserCursor(userID, &folderID, false, 100, nil, nil)
	if err != nil {
		return "", fmt.Errorf("list failed: %w", err)
	}

	if len(notes) == 0 {
		return "No notes found in this folder.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d note(s) in folder:\n\n", len(notes)))
	for _, note := range notes {
		result.WriteString(fmt.Sprintf("- **%s** (id: %s, %s)\n", note.Title, note.ID, note.CreatedAt.Format("Jan 2, 2006")))
	}
	return result.String(), nil
}

// 9. get_notes_by_date - Find notes in date range using SQL
func (t *ToolExecutor) getNotesByDate(userID string, input json.RawMessage) (string, error) {
	var params struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	startTime, err := time.Parse("2006-01-02", params.StartDate)
	if err != nil {
		return "Invalid start date format. Use YYYY-MM-DD.", nil
	}

	endTime := time.Now()
	if params.EndDate != "" {
		endTime, err = time.Parse("2006-01-02", params.EndDate)
		if err != nil {
			return "Invalid end date format. Use YYYY-MM-DD.", nil
		}
	}
	// Add a day to make end date inclusive
	endTime = endTime.Add(24 * time.Hour)

	notes, err := t.noteRepo.ListNotesByDateRange(userID, startTime, endTime, 50)
	if err != nil {
		return "", fmt.Errorf("query failed: %w", err)
	}

	if len(notes) == 0 {
		return "No notes found in this date range.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d note(s) between %s and %s:\n\n",
		len(notes), startTime.Format("Jan 2, 2006"), endTime.Add(-24*time.Hour).Format("Jan 2, 2006")))

	for _, note := range notes {
		result.WriteString(fmt.Sprintf("- **%s** (id: %s, %s)\n", note.Title, note.ID, note.CreatedAt.Format("Jan 2, 2006")))
	}
	return result.String(), nil
}

// 10. get_recent_notes - Get most recent notes
func (t *ToolExecutor) getRecentNotes(userID string, input json.RawMessage) (string, error) {
	var params struct {
		Limit int `json:"limit"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid input: %w", err)
	}

	if params.Limit == 0 {
		params.Limit = 10
	}

	notes, err := t.noteRepo.ListNotesByUserCursor(userID, nil, false, params.Limit, nil, nil)
	if err != nil {
		return "", fmt.Errorf("list failed: %w", err)
	}

	if len(notes) == 0 {
		return "No notes found.", nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Your %d most recent note(s):\n\n", len(notes)))
	for _, note := range notes {
		result.WriteString(fmt.Sprintf("- **%s** (id: %s, %s)\n", note.Title, note.ID, note.CreatedAt.Format("Jan 2, 2006 3:04 PM")))
	}
	return result.String(), nil
}
