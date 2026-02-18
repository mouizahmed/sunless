-- Structured transcript storage: speakers and segments tables

CREATE TABLE transcript_speakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    speaker_key INT NOT NULL,
    channel INT NOT NULL DEFAULT 0,
    label TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(note_id, speaker_key, channel)
);
CREATE INDEX idx_transcript_speakers_note ON transcript_speakers(note_id);

CREATE TABLE transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES transcript_speakers(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_time DOUBLE PRECISION,
    end_time DOUBLE PRECISION,
    segment_index INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transcript_segments_note ON transcript_segments(note_id);
CREATE INDEX idx_transcript_segments_speaker ON transcript_segments(speaker_id);
CREATE INDEX idx_transcript_segments_text ON transcript_segments USING GIN (to_tsvector('english', text));
