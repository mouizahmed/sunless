import { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Settings, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderContentItem } from "@/components/FolderContentItem";
import { SharingControls } from "@/components/SharingControls";
import { ShareDialog } from "@/components/dialog/ShareDialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";
import { dispatchFoldersReload } from "@/events/folderEvents";
import { type FolderItem } from "@/types/folder";

export function Folder() {
  const { folderId } = useParams<{ folderId: string }>();
  const { navigateToFolder } = useFolderNavigation();

  console.log("📂 Folder render - folderId:", folderId);

  const { currentWorkspace } = useWorkspace();

  interface FolderMember {
    user_id: string;
    name: string;
    email: string;
    avatar_url?: string;
    is_owner: boolean;
  }

  interface FolderData {
    contents: {
      folders: FolderItem[];
      files: FolderItem[];
    };
    folder: FolderItem | null;
    members: FolderMember[];
  }

  // Simple state-based cache
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Simple cache key for localStorage
  const cacheKey =
    currentWorkspace?.id && folderId
      ? `folder_${currentWorkspace.id}_${folderId}`
      : null;

  // Load folder data from cache or API
  const loadFolderData = useCallback(async (signal: AbortSignal) => {
    if (!currentWorkspace?.id || !folderId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Check cache for THIS specific folder
      let hasCachedData = false;
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          // Verify cache is for the correct folder
          if (data.folder && data.folder.id === folderId) {
            console.log("🚀 Showing cached folder instantly");
            setFolderData(data);
            setIsLoading(false); // Hide loading spinner for cached data
            hasCachedData = true;
          }
        }
      }

      // Clear old data when navigating to different folder or no cache
      if (!hasCachedData) {
        setFolderData(null);
      }

      // Check if request was cancelled before making API call
      if (signal.aborted) return;

      // Step 2: ALWAYS fetch fresh data from API (even if cache exists)
      console.log("📡 Fetching fresh folder data from API...");
      const startTime = Date.now();
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}?workspace_id=${currentWorkspace.id}`,
        { signal }
      );

      // Handle 404 - folder doesn't exist
      if (response.status === 404) {
        console.error("❌ Folder not found (404)");

        // Show toast notification
        toast.error("Folder not found", {
          description: "This folder may have been deleted or you don't have access.",
        });

        // Remove this specific folder from cache
        if (cacheKey) {
          localStorage.removeItem(cacheKey);
          console.log("🗑️ Removed folder from cache:", folderId);
        }

        // Trigger sidebar refresh to update folder list
        dispatchFoldersReload();

        // Navigate back to home
        navigateToFolder(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch folder data: ${response.status}`);
      }

      const freshData = await response.json();
      const endTime = Date.now();
      console.log(`📡 Folder synced in ${endTime - startTime}ms`);

      // Check if request was cancelled before updating state
      if (signal.aborted) return;

      // Step 3: Update with fresh data
      setFolderData(freshData);

      // Step 4: Update cache with fresh data
      if (cacheKey) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: freshData,
            timestamp: Date.now(),
          }),
        );
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("🚫 Request cancelled");
        return;
      }
      console.error("Failed to load folder data:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentWorkspace?.id, folderId, cacheKey, navigateToFolder]);

  // Load folder data when folderId or workspace changes
  useEffect(() => {
    const abortController = new AbortController();
    loadFolderData(abortController.signal);

    // Cleanup: abort request if component unmounts or folderId changes
    return () => {
      abortController.abort();
    };
  }, [loadFolderData]);

  console.log(
    "📂 FolderView cache result - isLoading:",
    isLoading,
    "hasData:",
    !!folderData,
  );

  // Parse folder data
  const items: FolderItem[] = folderData
    ? [
        ...folderData.contents.folders.map((f) => ({
          ...f,
          type: "folder" as const,
        })),
        ...folderData.contents.files.map((f) => ({
          ...f,
          type: "file" as const,
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    : [];

  const currentFolder = folderData?.folder || null;
  const members = folderData?.members || [];

  const handleFolderClick = (clickedFolderId: string) => {
    navigateToFolder(clickedFolderId);
  };

  // Share dialog handlers
  const handleAddUser = async (email: string, role: string) => {
    if (!currentWorkspace?.id || !folderId) return;

    try {
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            email,
            access_type: role,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add user");
      }

      toast.success(`Added ${email} as ${role}`);

      // Reload folder data to get updated members
      const controller = new AbortController();
      loadFolderData(controller.signal);
    } catch (error) {
      console.error("Failed to add user:", error);
      toast.error("Failed to add user");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!currentWorkspace?.id || !folderId) return;

    try {
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}/access/${userId}?workspace_id=${currentWorkspace.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove user");
      }

      toast.success("User removed");

      // Reload folder data to get updated members
      const controller = new AbortController();
      loadFolderData(controller.signal);
    } catch (error) {
      console.error("Failed to remove user:", error);
      toast.error("Failed to remove user");
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    if (!currentWorkspace?.id || !folderId) return;

    try {
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}/access/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            access_type: role,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update user role");
      }

      toast.success("Role updated");

      // Reload folder data to get updated members
      const controller = new AbortController();
      loadFolderData(controller.signal);
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleUpdateVisibility = async (visibility: string) => {
    if (!currentWorkspace?.id || !folderId) return;

    try {
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            access_mode: visibility === "invite_only" ? "invite_only" : "workspace",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      toast.success("Visibility updated");

      // Reload folder data
      const controller = new AbortController();
      loadFolderData(controller.signal);
    } catch (error) {
      console.error("Failed to update visibility:", error);
      toast.error("Failed to update visibility");
    }
  };

  const handleUpdateLinkAccess = async (access: string) => {
    if (!currentWorkspace?.id || !folderId) return;

    try {
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}/link-access`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            link_access: access,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update link access");
      }

      toast.success("Link access updated");

      // Reload folder data
      const controller = new AbortController();
      loadFolderData(controller.signal);
    } catch (error) {
      console.error("Failed to update link access:", error);
      toast.error("Failed to update link access");
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/folder/${folderId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="w-full h-full">
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 h-full overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          {!folderData && !error ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-[200px]" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex -space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-8 w-[120px] rounded" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {currentFolder?.name}
                </h1>
                {currentFolder?.access_mode === "invite_only" && (
                  <Lock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Settings button */}
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                {/* Sharing controls */}
                <SharingControls
                  collaborators={members.map((m) => ({
                    id: m.user_id,
                    name: m.name,
                    email: m.email,
                    avatar_url: m.avatar_url,
                  }))}
                  onManageAccess={() => setShowShareDialog(true)}
                  onShare={() => setShowShareDialog(true)}
                  onCopyLink={() => {
                    // Copy link functionality
                    const link = `${window.location.origin}/folder/${folderId}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Link copied to clipboard");
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-auto p-6">
          {!folderData && !error ? (
            <div className="space-y-3">
              {/* Loading skeleton for folder items */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-lg font-medium mb-2 text-red-600 dark:text-red-400">
                Failed to load folder
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {error.message}
              </div>
              <Button
                onClick={() => {
                  const controller = new AbortController();
                  loadFolderData(controller.signal);
                }}
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-lg font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                This folder is empty
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Create a new folder or upload files to get started
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <FolderContentItem
                  key={item.id}
                  item={item}
                  onFolderClick={handleFolderClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      {currentFolder && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          itemType="folder"
          itemName={currentFolder.name}
          workspaceName={currentWorkspace?.name}
          currentUsers={members.map((m) => ({
            id: m.user_id,
            name: m.name,
            email: m.email,
            avatar_url: m.avatar_url,
            access_type: m.is_owner ? "owner" : "editor",
          }))}
          visibility={currentFolder.access_mode === "invite_only" ? "invite_only" : "workspace"}
          linkAccess="invite_only"
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
          onUpdateUserRole={handleUpdateUserRole}
          onUpdateVisibility={handleUpdateVisibility}
          onUpdateLinkAccess={handleUpdateLinkAccess}
          onCopyLink={handleCopyLink}
        />
      )}
    </div>
  );
}
