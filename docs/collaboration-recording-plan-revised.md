# Collaboration + Recording Plan (Revised)

**Status:** Proposed
**Updated:** 2026-02-10

## Goals
- Ship core note features with minimal complexity.
- Add collaboration only after single-user recording is stable.
- Avoid premature infra (presence DB, version history, transcript segmentation).

## Phase 0: Core Foundations (Prerequisite)
- Create `notes` table in PostgreSQL.
- Implement notes CRUD APIs.
- Stabilize authentication and routing.
- Ensure dashboard/overlay flows are stable.

## Schema Changes

### Phase 0: Create Notes Table (Baseline)
```sql
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID NULL REFERENCES folders(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled note',
  note_markdown TEXT NOT NULL DEFAULT '',
  transcript_text TEXT NOT NULL DEFAULT '',
  enhanced_markdown TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user
  ON notes(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;
```

### Phase 1: Single-User Recording (MVP)
```sql
-- Track recording sessions (one per "Start meeting" event)
CREATE TABLE IF NOT EXISTS note_recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'stopped'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ NULL,
  stopped_at TIMESTAMPTZ NULL,
  transcript_chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recording_sessions_note
  ON note_recording_sessions(note_id, status);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user
  ON note_recording_sessions(user_id);
```

### Phase 2: Collaboration (YJS)
```sql
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS yjs_document BYTEA NULL,
  ADD COLUMN IF NOT EXISTS collaboration_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_edited_by varchar(255) NULL REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_notes_collaboration
  ON notes (collaboration_enabled, updated_at DESC)
  WHERE collaboration_enabled = true;
```

### Phase 3: Concurrent Recording (Optional)
```sql
-- Allow multiple active sessions per note (already supported above).
-- Optional: add last_recorded_at for sorting/analytics.
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS last_recorded_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_notes_last_recorded
  ON notes(last_recorded_at DESC);
```

## Phase 1: Single-User Recording (MVP)
- Add `note_recording_sessions` table.
- Implement start/stop recording endpoints.
- Create session on start; append transcript on stop.
- UI: "Start meeting" creates note + session.
- No "resume recording" in overlay.
- If a user leaves a meeting, they start a new note next time.

## Phase 2: Note Collaboration (YJS)
- Add `yjs_document` + `collaboration_enabled` columns.
- Implement YJS WebSocket server.
- Use textarea + Y.Text first (upgrade later if needed).
- Keep transcript out of YJS (append-only via REST API).

## Phase 3: Concurrent Recording (If Needed)
- Allow multiple active recording sessions per note.
- Merge transcripts chronologically on stop.
- Add presence UI only if real-time usage demands it.

## Out of Scope (For Now)
- `note_versions` table and version history UI.
- `note_collaborators` table / Redis presence.
- Transcript segments table.
- TipTap editor migration.
- Transcript in YJS.

## Decisions
- **No resume recording from overlay.**
- **New note per meeting until recording sessions + collaboration land.**
- **Collaboration comes after single-user recording is stable.**
