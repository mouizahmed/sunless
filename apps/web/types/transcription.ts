export interface TranscriptionConfig {
  model: string;
  language: string;
  speakerDetection: boolean;
  fillerDetection: boolean;
}

export interface Transcription {
  id: string;
  user_id: string;
  file_id: string;
  glossary_id?: string;
  language_code?: string;
  status: "queued" | "processing" | "completed" | "failed";
  model: string;
  settings: TranscriptionSettings;
  job_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface TranscriptionSettings {
  speaker_detection: boolean;
  filler_detection: boolean;
}

export interface BatchCreateTranscriptionsRequest {
  file_ids: string[];
  folder_id?: string;
  glossary_id?: string;
  language_code?: string;
  model: string;
  settings: TranscriptionSettings;
}

export interface TranscriptionResponse {
  id: string;
  file_id: string;
  status: string;
  job_id?: string;
}

export interface BatchCreateTranscriptionsResponse {
  success: boolean;
  transcriptions: TranscriptionResponse[];
}

export interface TranscriptionsListResponse {
  transcriptions: Transcription[];
}
