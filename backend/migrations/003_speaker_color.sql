-- Add color column to transcript_speakers

ALTER TABLE transcript_speakers ADD COLUMN color TEXT NOT NULL DEFAULT '';
