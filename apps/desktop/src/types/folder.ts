// Shared folder types used across the application

export interface BaseFolder {
  id: string;
  name: string;
  parent_id?: string;
  workspace_id: string;
  access_mode?: "workspace" | "invite_only";
  created_at: string;
  updated_at: string;
}

export interface FolderItem extends BaseFolder {
  type: "folder" | "file";
  size?: number;
  length?: string;
  access_type?: "owner" | "full" | "edit" | "view";
}

// Alias for folder created events (same as BaseFolder)
export type FolderCreatedDetail = BaseFolder;

// Alias for shared folders (BaseFolder with required access_type)
export interface SharedFolder extends BaseFolder {
  access_type: "owner" | "full" | "edit" | "view";
}
