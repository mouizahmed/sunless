export interface Tag {
  id: string;
  name: string;
  item_id: string;
  item_type: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Breadcrumb {
  id: string | null;
  name: string;
  href: string;
}

export interface FolderContents {
  folders: Folder[];
  files: FileItem[];
}

export interface FileItem {
  id: string;
  name: string;
  type: "video" | "audio" | "folder" | "text" | "file";
  size?: number;
  length?: string;
  language?: string | string[]; // Support single language or multiple languages
  service?: string;
  tags?: Tag[];
  created_at: string;
  folder_id?: string;
}

export interface FolderDataResponse {
  folder: Folder | null;
  breadcrumbs: Breadcrumb[];
  contents: {
    folders: Folder[];
    files: FileItem[];
  };
  stats: {
    total_files: number;
    total_folders: number;
  };
}

export interface FolderData {
  folder: Folder | null;
  breadcrumbs: Breadcrumb[];
  files: FileItem[]; // Combined folders and files for table display
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateFolder: (updatedFolder: Folder) => void;
  addFolder: (newFolder: Folder) => void;
  deleteFolder: (folderId: string) => void;
  moveFolder: (folderId: string, oldParentId: string | null, newParentId: string | null, updatedFolder: Folder) => void;
}