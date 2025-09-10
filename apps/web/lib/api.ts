import { UserResponse } from "@/types/user";
import { FolderDataResponse, Folder, Tag } from "@/types/folder";
import {
  Glossary,
  GlossaryItem,
  CreateGlossaryRequest,
  UpdateGlossaryRequest,
  CreateGlossaryItemRequest,
  UpdateGlossaryItemRequest,
  GlossaryResponse,
  GlossaryItemsResponse,
} from "@/types/glossary";
import {
  Transcription,
  BatchCreateTranscriptionsRequest,
  BatchCreateTranscriptionsResponse,
  TranscriptionsListResponse,
} from "@/types/transcription";
import {
  InitiateUploadRequest,
  InitiateUploadResponse,
  CompleteUploadRequest,
  UploadCompleteResponse,
  FileStatusResponse,
} from "@/types/file";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    // Try to extract error message from response body
    let errorMessage = `API request failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If we can't parse the response body, use the default message
    }

    throw new ApiError(errorMessage, response.status, response.statusText);
  }

  return response.json();
}

export const userApi = {
  getCurrentUser: (token: string): Promise<UserResponse> =>
    apiRequest<UserResponse>("/user/me", token),
};

export const folderApi = {
  // Get folder data (root or specific folder)
  getFolderData: (
    token: string,
    folderId?: string,
  ): Promise<FolderDataResponse> => {
    const endpoint = folderId ? `/folders/${folderId}` : "/folders";
    return apiRequest<FolderDataResponse>(endpoint, token);
  },

  // Get all folders for tree view
  getAllFolders: (token: string): Promise<{ folders: Folder[] }> =>
    apiRequest<{ folders: Folder[] }>("/folders/all", token),

  // Create a new folder
  createFolder: (
    token: string,
    data: { name: string; parent_id?: string | null },
  ): Promise<Folder> =>
    apiRequest<Folder>("/folders", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update a folder
  updateFolder: (
    token: string,
    folderId: string,
    data: { name: string },
  ): Promise<Folder> =>
    apiRequest<Folder>(`/folders/${folderId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Delete a folder
  deleteFolder: (token: string, folderId: string): Promise<void> =>
    apiRequest<void>(`/folders/${folderId}`, token, {
      method: "DELETE",
    }),

  // Move a folder
  moveFolder: (
    token: string,
    folderId: string,
    newParentId: string | null,
  ): Promise<Folder> =>
    apiRequest<Folder>(`/folders/${folderId}/move`, token, {
      method: "PATCH",
      body: JSON.stringify({ parent_id: newParentId }),
    }),

  // Update folder tags
  updateFolderTags: (
    token: string,
    folderId: string,
    tags: string[],
  ): Promise<{ tags: Tag[] }> =>
    apiRequest<{ tags: Tag[] }>(`/items/${folderId}/tags?type=folder`, token, {
      method: "PUT",
      body: JSON.stringify({ tags }),
    }),
};

export const uploadApi = {
  // Initiate upload and get presigned URLs
  initiateUpload: (
    token: string,
    data: InitiateUploadRequest,
  ): Promise<InitiateUploadResponse> =>
    apiRequest<InitiateUploadResponse>("/upload/initiate", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Complete multipart upload
  completeUpload: (
    token: string,
    data: CompleteUploadRequest,
  ): Promise<UploadCompleteResponse> =>
    apiRequest<UploadCompleteResponse>("/upload/complete", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Cancel upload
  cancelUpload: (
    token: string,
    fileId: string,
  ): Promise<{ message: string; file_id: string }> =>
    apiRequest<{ message: string; file_id: string }>(
      `/upload/${fileId}/cancel`,
      token,
      {
        method: "POST",
      },
    ),

  // Delete uploaded file
  deleteUpload: (
    token: string,
    fileId: string,
  ): Promise<{ message: string; file_id: string }> =>
    apiRequest<{ message: string; file_id: string }>(
      `/upload/${fileId}`,
      token,
      {
        method: "DELETE",
      },
    ),

  // Get upload status
  getUploadStatus: (
    token: string,
    fileId: string,
  ): Promise<FileStatusResponse> =>
    apiRequest<FileStatusResponse>(`/upload/${fileId}/status`, token),

  // Upload chunk directly to B2 using Native API
  uploadChunk: async (
    uploadUrl: string,
    authToken: string,
    chunkNumber: number,
    chunk: Blob,
    fileName: string,
    p0: string,
    abortSignal?: AbortSignal,
  ): Promise<string> => {
    // Calculate SHA1 hash of the chunk
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1Hash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: chunk,
      headers: {
        Authorization: authToken,
        "X-Bz-Part-Number": chunkNumber.toString(),
        "X-Bz-Content-Sha1": sha1Hash,
        "Content-Length": chunk.size.toString(),
      },
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new ApiError(
        `Chunk upload failed: ${response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    return sha1Hash;
  },

  // Upload single file directly to B2 using Native API
  uploadFile: async (
    uploadUrl: string,
    authToken: string,
    file: Blob,
    fileName: string,
    contentType: string,
    abortSignal?: AbortSignal,
  ): Promise<string> => {
    // Calculate SHA1 hash of the file
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1Hash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: file,
      headers: {
        Authorization: authToken,
        "X-Bz-File-Name": encodeURIComponent(fileName),
        "Content-Type": contentType,
        "X-Bz-Content-Sha1": sha1Hash,
        "Content-Length": file.size.toString(),
      },
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new ApiError(
        `File upload failed: ${response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    const result = await response.json();
    return result.fileId || sha1Hash;
  },
};

export const urlApi = {
  // TODO
};

export const glossaryApi = {
  // Get all glossaries
  getGlossaries: (token: string): Promise<GlossaryResponse> =>
    apiRequest<GlossaryResponse>("/glossaries", token),

  // Create a new glossary
  createGlossary: (
    token: string,
    data: CreateGlossaryRequest,
  ): Promise<Glossary> =>
    apiRequest<Glossary>("/glossaries", token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update a glossary
  updateGlossary: (
    token: string,
    glossaryId: string,
    data: UpdateGlossaryRequest,
  ): Promise<Glossary> =>
    apiRequest<Glossary>(`/glossaries/${glossaryId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Delete a glossary
  deleteGlossary: (token: string, glossaryId: string): Promise<void> =>
    apiRequest<void>(`/glossaries/${glossaryId}`, token, {
      method: "DELETE",
    }),

  // Get glossary items
  getGlossaryItems: (
    token: string,
    glossaryId: string,
  ): Promise<GlossaryItemsResponse> =>
    apiRequest<GlossaryItemsResponse>(`/glossaries/${glossaryId}/items`, token),

  // Create a new glossary item
  createGlossaryItem: (
    token: string,
    glossaryId: string,
    data: CreateGlossaryItemRequest,
  ): Promise<GlossaryItem> =>
    apiRequest<GlossaryItem>(`/glossaries/${glossaryId}/items`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update a glossary item
  updateGlossaryItem: (
    token: string,
    glossaryId: string,
    itemId: string,
    data: UpdateGlossaryItemRequest,
  ): Promise<GlossaryItem> =>
    apiRequest<GlossaryItem>(`/glossaries-items/${itemId}`, token, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Delete a glossary item
  deleteGlossaryItem: (
    token: string,
    glossaryId: string,
    itemId: string,
  ): Promise<void> =>
    apiRequest<void>(`/glossaries-items/${itemId}`, token, {
      method: "DELETE",
    }),
};

export const transcriptionApi = {
  // Batch create transcriptions
  batchCreate: (
    token: string,
    data: BatchCreateTranscriptionsRequest,
  ): Promise<BatchCreateTranscriptionsResponse> =>
    apiRequest<BatchCreateTranscriptionsResponse>(
      "/transcriptions/batch",
      token,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  // Get all transcriptions for user
  getTranscriptions: (token: string): Promise<TranscriptionsListResponse> =>
    apiRequest<TranscriptionsListResponse>("/transcriptions", token),

  // Get specific transcription
  getTranscription: (
    token: string,
    transcriptionId: string,
  ): Promise<Transcription> =>
    apiRequest<Transcription>(`/transcriptions/${transcriptionId}`, token),

  // Delete transcription
  deleteTranscription: (
    token: string,
    transcriptionId: string,
  ): Promise<void> =>
    apiRequest<void>(`/transcriptions/${transcriptionId}`, token, {
      method: "DELETE",
    }),
};
