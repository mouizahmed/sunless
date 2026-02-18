-- Remove the legacy transcript_text column from notes.
-- Transcript data is now stored in transcript_segments.

ALTER TABLE notes DROP COLUMN IF EXISTS transcript_text;
