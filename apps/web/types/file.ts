export type UploadStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "processing"
  | "failed"
  | "cancelled"
  | "deleted";

export type UploadType = "file" | "url";

export interface UploadItem {
  id: string;
  fileId?: string; // Backend file ID for transcription
  type: UploadType;
  name?: string;
  contentType?: string;
  size?: number;
  duration?: number;
  status: UploadStatus;
  progress: number | 0;
  error?: string;
}

export interface UploadFile extends UploadItem {
  type: "file";
  file: File;
  uploadedChunks?: number;
  totalChunks?: number;
}

export interface UploadUrl extends UploadItem {
  type: "url";
  url: string;
}

export type UploadMedia = UploadFile | UploadUrl;

export interface InitiateUploadRequest {
  file_name: string;
  file_size: number;
  content_type: string;
  duration?: number;
}

export interface InitiateUploadResponse {
  file_id: string;
  chunk_urls: Array<{
    chunk_number: number;
    url: string;
    authorization_token: string;
  }>;
  total_chunks: number;
  chunk_size: number;
  storage_key: string;
}

export interface CompleteUploadRequest {
  file_id: string;
  parts: Array<{
    part_number: number;
    etag: string;
  }>;
}

export interface UploadCompleteResponse {
  file_id: string;
  file_url: string;
  message: string;
}

export interface FileStatusResponse {
  id: string;
  name: string;
  size_bytes: number;
  content_type: string;
  status: string;
  storage_url?: string;
  created_at: string;
  updated_at: string;
}
