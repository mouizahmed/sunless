import { makeAuthenticatedApiCall } from "@/utils/firebase-api";
import { type SharedFolder } from "@/types/folder";

const API_BASE = "http://localhost:8080/api";

// Types for folder access control
export interface FolderAccess {
  id: string;
  folder_id: string;
  user_id: string;
  access_type: "owner" | "full" | "edit" | "view";
  granted_by: string;
  created_at: string;
  updated_at: string;
}

export interface ShareFolderRequest {
  user_emails: string[];
  access_type: "full" | "edit" | "view";
}

export interface UpdateFolderSettingsRequest {
  access_mode?: "workspace" | "invite_only";
  inherit_settings?: boolean;
}

export interface FolderMember {
  user_id: string;
  email: string;
  name: string;
  access_type: "owner" | "full" | "edit" | "view";
  granted_by: string;
  granted_at: string;
}

// Share a folder with specific users
export async function shareFolder(folderId: string, request: ShareFolderRequest): Promise<void> {
  const response = await makeAuthenticatedApiCall(`${API_BASE}/folders/${folderId}/share`, {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to share folder");
  }
}

// Get folder members/permissions
export async function getFolderMembers(folderId: string): Promise<FolderMember[]> {
  const response = await makeAuthenticatedApiCall(`${API_BASE}/folders/${folderId}/members`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get folder members");
  }

  return response.json();
}

// Remove user access from folder
export async function removeFolderAccess(folderId: string, userId: string): Promise<void> {
  const response = await makeAuthenticatedApiCall(`${API_BASE}/folders/${folderId}/access/${userId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to remove folder access");
  }
}

// Update folder settings (access mode, inheritance)
export async function updateFolderSettings(folderId: string, settings: UpdateFolderSettingsRequest): Promise<void> {
  const response = await makeAuthenticatedApiCall(`${API_BASE}/folders/${folderId}/settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update folder settings");
  }
}

// Get shared folders for "Shared with me" tab
export async function getSharedFolders(): Promise<SharedFolder[]> {
  const response = await makeAuthenticatedApiCall(`${API_BASE}/folders/shared`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get shared folders");
  }

  return response.json();
}