import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { FolderContentItem } from "@/components/FolderContentItem";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";
import { type FolderItem } from "@/types/folder";

export function AllFiles() {
  const { currentWorkspace } = useWorkspace();
  const { navigateToFolder } = useFolderNavigation();

  interface AllFilesData {
    contents: {
      folders: FolderItem[];
      files: FolderItem[];
    };
  }

  const [filesData, setFilesData] = useState<AllFilesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = currentWorkspace?.id
    ? `allfiles_${currentWorkspace.id}`
    : null;

  const loadFilesData = useCallback(
    async (signal: AbortSignal) => {
      if (!currentWorkspace?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Check cache for instant UI
        let hasCachedData = false;
        if (cacheKey) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const { data } = JSON.parse(cached);
            console.log("🚀 Showing cached all files instantly");
            setFilesData(data);
            setIsLoading(false);
            hasCachedData = true;
          }
        }

        if (!hasCachedData) {
          setFilesData(null);
        }

        if (signal.aborted) return;

        // Step 2: Fetch fresh data (root folder contents)
        console.log("📡 Fetching fresh all files from API...");
        const startTime = Date.now();
        const response = await makeAuthenticatedApiCall(
          `http://localhost:8080/api/folders/?workspace_id=${currentWorkspace.id}`,
          { signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.status}`);
        }

        const freshData = await response.json();
        const endTime = Date.now();
        console.log(`📡 All files synced in ${endTime - startTime}ms`);

        if (signal.aborted) return;

        // Step 3: Update with fresh data
        setFilesData(freshData);

        // Step 4: Update cache
        if (cacheKey) {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: freshData,
              timestamp: Date.now(),
            })
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("🚫 Request cancelled");
          return;
        }
        console.error("Failed to load all files:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
        toast.error("Failed to load files");
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [currentWorkspace?.id, cacheKey]
  );

  useEffect(() => {
    const abortController = new AbortController();
    loadFilesData(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadFilesData]);

  // Combine folders and files, sorted by creation date
  const items: FolderItem[] = filesData
    ? [
        ...filesData.contents.folders.map((f) => ({
          ...f,
          type: "folder" as const,
        })),
        ...filesData.contents.files.map((f) => ({
          ...f,
          type: "file" as const,
        })),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  const handleFolderClick = (folderId: string) => {
    navigateToFolder(folderId);
  };

  return (
    <div className="w-full h-full">
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 h-full overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              All Files
            </h1>
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
                No files yet
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Upload files or create folders to get started
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-lg font-medium mb-2 text-red-600 dark:text-red-400">
                Failed to load files
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {error.message}
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
    </div>
  );
}
