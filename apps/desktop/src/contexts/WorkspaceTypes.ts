import { createContext } from "react";

// Types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  owner_user_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  member_count: number;
  user_role: string;
}

export interface UserWorkspacesResponse {
  workspaces: Workspace[];
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export interface WorkspaceContextType {
  // State
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (data: CreateWorkspaceRequest) => Promise<Workspace>;
  updateWorkspace: (
    id: string,
    data: Partial<CreateWorkspaceRequest>,
  ) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}

// Create context
export const WorkspaceContext = createContext<WorkspaceContextType | null>(
  null,
);
