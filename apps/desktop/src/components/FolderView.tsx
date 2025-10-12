import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderContentItem } from "./FolderContentItem";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { Breadcrumbs } from "./Breadcrumbs";
import { useWorkspace } from "@/hooks/useWorkspace";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";

interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: number;
  length?: string;
  created_at: string;
  updated_at: string;
  access_mode?: "workspace" | "invite_only";
  parent_id?: string;
}

// Breadcrumb interface removed - not needed anymore

interface FolderViewProps {
  folderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
}

export function FolderView({ folderId, onFolderChange }: FolderViewProps) {
  console.log("📂 FolderView render - folderId:", folderId);

  const { currentWorkspace } = useWorkspace();
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  // Simple state-based cache
  const [folderData, setFolderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Simple cache key for localStorage
  const cacheKey =
    currentWorkspace?.id && folderId
      ? `folder_${currentWorkspace.id}_${folderId}`
      : null;

  // Load folder data from cache or API
  const loadFolderData = useCallback(async () => {
    if (!currentWorkspace?.id || !folderId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Cache valid for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            console.log("🚀 Folder data loaded from cache instantly");
            setFolderData(data);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch from API
      console.log("📡 Fetching folder data from API...");
      const startTime = Date.now();
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/${folderId}?workspace_id=${currentWorkspace.id}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch folder data: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      console.log(`📡 Folder data fetched in ${endTime - startTime}ms`);

      setFolderData(data);

      // Cache the result
      if (cacheKey) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          }),
        );
      }
    } catch (error) {
      console.error("Failed to load folder data:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, folderId, cacheKey]);

  // Load folder data when folderId or workspace changes
  useEffect(() => {
    loadFolderData();
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
        ...folderData.contents.folders.map((f: any) => ({
          ...f,
          type: "folder" as const,
        })),
        ...folderData.contents.files.map((f: any) => ({
          ...f,
          type: "file" as const,
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    : [];

  const breadcrumbs = folderData?.breadcrumbs || [];
  const currentFolder = folderData?.folder || null;

  const handleFolderClick = (clickedFolderId: string) => {
    onFolderChange?.(clickedFolderId);
  };

  const handleBreadcrumbClick = (breadcrumbId: string | null) => {
    onFolderChange?.(breadcrumbId);
  };

  const handleFolderCreated = useCallback(
    async (newFolder?: any) => {
      console.log("🔄 FolderView handleFolderCreated called with:", newFolder);

      if (!newFolder) {
        console.log("⚠️ FolderView no newFolder provided");
        return;
      }

      // Optimistically update the state
      setFolderData((currentData) => {
        if (!currentData || !currentData.contents) {
          return currentData;
        }

        const updatedData = {
          ...currentData,
          contents: {
            ...currentData.contents,
            folders: [...(currentData.contents.folders || []), newFolder],
          },
        };

        // Update localStorage cache
        if (cacheKey) {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: updatedData,
              timestamp: Date.now(),
            }),
          );
        }

        return updatedData;
      });

      console.log("✅ Folder added to view instantly!");
    },
    [cacheKey],
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header Section */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        {/* Breadcrumbs */}
        <Breadcrumbs
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
          className="mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {currentFolder?.name || "Loading..."}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white border-0"
                >
                  <Plus className="w-4 h-4" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[160px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              >
                <DropdownMenuItem
                  onClick={() => setShowCreateFolder(true)}
                  className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-neutral-500 dark:text-neutral-400">
              Loading...
            </div>
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <div className="text-lg font-medium mb-2 text-red-600 dark:text-red-400">
              Failed to load folder
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              {error.message}
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
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

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        parentFolderId={folderId || undefined}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
}
