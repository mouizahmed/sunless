import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  Workspace,
  UserWorkspacesResponse,
  CreateWorkspaceRequest,
  WorkspaceContextType,
  WorkspaceContext,
} from "./WorkspaceTypes";
import { CriticalError } from "../components/CriticalError";
import { makeAuthenticatedApiCall } from "../utils/firebase-api";

// API helper function
const makeApiRequest = async (url: string, options: RequestInit = {}) => {
  const baseUrl =
    (window as unknown as { BACKEND_URL?: string }).BACKEND_URL ||
    "http://localhost:8080";

  const response = await makeAuthenticatedApiCall(
    `${baseUrl}/api${url}`,
    options,
  );

  if (!response.ok) {
    const errorData: { error?: string } = await response
      .json()
      .catch(() => ({}));
    throw new globalThis.Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
};

// Provider component
interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] =
    useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criticalError, setCriticalError] = useState<boolean>(false);

  const fetchWorkspaces = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      setCriticalError(false);

      // Simple cache key for workspaces
      const cacheKey = `workspaces_${user.id}`;

      // Try cache first
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes (workspaces don't change often)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log("🚀 Workspaces loaded from cache instantly");
          setWorkspaces(data);
          setIsLoading(false);
          return;
        }
      }

      console.log("📡 Fetching workspaces from API...");
      const startTime = Date.now();
      const data: UserWorkspacesResponse = await makeApiRequest("/workspaces");
      const workspaces = data.workspaces || [];
      const endTime = Date.now();
      console.log(`📡 Workspaces fetched in ${endTime - startTime}ms`);

      setWorkspaces(workspaces);
      console.log("📁 Loaded", workspaces.length, "workspaces");

      // Cache the result
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: workspaces,
          timestamp: Date.now(),
        }),
      );
    } catch (err) {
      const errorMessage =
        err instanceof globalThis.Error
          ? err.message
          : "Failed to fetch workspaces";
      setError(errorMessage);
      setWorkspaces([]); // Ensure workspaces is always an array
      console.error("❌ Failed to fetch workspaces:", err);

      // Show critical error screen for fetch failures
      setCriticalError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load workspaces when user logs in
  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    } else {
      // Clear state when user logs out
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setError(null);
      setCriticalError(false);
      setIsLoading(false);
    }
  }, [user, fetchWorkspaces]);

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !currentWorkspace) {
      setCurrentWorkspaceState(workspaces[0]);
    }
  }, [workspaces, currentWorkspace]);

  const setCurrentWorkspace = (workspace: Workspace): void => {
    setCurrentWorkspaceState(workspace);
    console.log("🔄 Switched to workspace:", workspace.name);
  };

  const createWorkspace = async (
    data: CreateWorkspaceRequest,
  ): Promise<Workspace> => {
    try {
      setError(null);

      const response = await makeApiRequest("/workspaces", {
        method: "POST",
        body: JSON.stringify(data),
      });

      // The API returns a WorkspaceResponse with workspace data and member_count
      const newWorkspace = {
        ...response,
        member_count: response.member_count || 1, // Default to 1 if not provided
        user_role: response.user_role || "owner", // Default to owner for creator
      };

      // Add to workspaces list
      const updatedWorkspaces = [...workspaces, newWorkspace];
      setWorkspaces(updatedWorkspaces);

      // Update cache with new workspace
      if (user) {
        const cacheKey = `workspaces_${user.id}`;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedWorkspaces,
            timestamp: Date.now(),
          }),
        );
      }

      // Set as current workspace
      setCurrentWorkspaceState(newWorkspace);

      console.log("✅ Created workspace:", newWorkspace.name);
      return newWorkspace;
    } catch (err) {
      const errorMessage =
        err instanceof globalThis.Error
          ? err.message
          : "Failed to create workspace";
      setError(errorMessage);
      throw err;
    }
  };

  const updateWorkspace = async (
    id: string,
    data: Partial<CreateWorkspaceRequest>,
  ): Promise<Workspace> => {
    try {
      setError(null);

      const updatedWorkspace: Workspace = await makeApiRequest(
        `/workspaces/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );

      // Update in workspaces list
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === id ? updatedWorkspace : workspace,
        ),
      );

      // Update current workspace if it was the one being updated
      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState(updatedWorkspace);
      }

      console.log("✅ Updated workspace:", updatedWorkspace.name);
      return updatedWorkspace;
    } catch (err) {
      const errorMessage =
        err instanceof globalThis.Error
          ? err.message
          : "Failed to update workspace";
      setError(errorMessage);
      throw err;
    }
  };

  const deleteWorkspace = async (id: string): Promise<void> => {
    try {
      setError(null);

      await makeApiRequest(`/workspaces/${id}`, {
        method: "DELETE",
      });

      // Remove from workspaces list
      setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== id));

      // If deleted workspace was current, switch to first available
      if (currentWorkspace?.id === id) {
        const remaining = (workspaces || []).filter(
          (workspace) => workspace.id !== id,
        );
        setCurrentWorkspaceState(remaining.length > 0 ? remaining[0] : null);
      }

      console.log("✅ Deleted workspace");
    } catch (err) {
      const errorMessage =
        err instanceof globalThis.Error
          ? err.message
          : "Failed to delete workspace";
      setError(errorMessage);
      throw err;
    }
  };

  const value: WorkspaceContextType = {
    // State
    workspaces,
    currentWorkspace,
    isLoading,
    error,

    // Actions
    setCurrentWorkspace,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };

  // Show error screen for critical errors
  if (criticalError) {
    return (
      <CriticalError
        title="Unable to connect to server"
        message="Cannot load your workspaces. Please check your internet connection and try again."
        onRetry={() => {
          setCriticalError(false);
          fetchWorkspaces();
        }}
        retryText="Retry Connection"
      />
    );
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
