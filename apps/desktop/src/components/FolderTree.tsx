import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Lock,
} from "lucide-react";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";

interface FolderNode {
  id: string;
  name: string;
  parent_id?: string;
  workspace_id: string;
  children?: FolderNode[];
  expanded?: boolean;
  access_mode?: "workspace" | "invite_only";
}

interface ApiFolderData {
  id: string;
  name: string;
  parent_id?: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  access_mode?: "workspace" | "invite_only";
}

interface FolderTreeData {
  folders: ApiFolderData[];
}

interface FolderTreeItemProps {
  folder: FolderNode;
  level: number;
  activeFolderId?: string;
  onFolderClick: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  folderExpansions: Record<string, boolean>;
}

function FolderTreeItem({
  folder,
  level,
  activeFolderId,
  onFolderClick,
  onToggleExpand,
  folderExpansions,
}: FolderTreeItemProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = activeFolderId === folder.id;
  const isExpanded = folderExpansions[folder.id] ?? false;

  return (
    <div>
      <div
        style={{
          paddingLeft: `${level * 8}px`,
        }}
      >
        <Button
          variant="ghost"
          className={`w-full justify-start gap-1 py-1 px-2 text-xs h-7 hover:bg-violet-100/30 dark:hover:bg-violet-900/20 ${
            isActive ? "bg-violet-200/40 dark:bg-violet-800/30" : ""
          }`}
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          onClick={() => onFolderClick(folder.id)}
        >
          {hasChildren && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="flex items-center justify-center w-4 h-4 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </div>
          )}
          {!hasChildren && <div className="w-4" />}

          {isExpanded && hasChildren ? (
            <FolderOpen
              size={14}
              className="text-violet-600 dark:text-violet-400"
            />
          ) : (
            <Folder
              size={14}
              className="text-violet-600 dark:text-violet-400"
            />
          )}

          <span className="truncate">{folder.name}</span>

          {folder.access_mode === "invite_only" && (
            <Lock
              size={10}
              className="text-neutral-400 dark:text-neutral-500 ml-auto flex-shrink-0"
            />
          )}
        </Button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              activeFolderId={activeFolderId}
              onFolderClick={onFolderClick}
              onToggleExpand={onToggleExpand}
              folderExpansions={folderExpansions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeProps {
  folders: FolderNode[];
  activeFolderId?: string;
  onFolderClick: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  folderExpansions: Record<string, boolean>;
}

function FolderTreeView({
  folders,
  activeFolderId,
  onFolderClick,
  onToggleExpand,
  folderExpansions,
}: FolderTreeProps) {
  return (
    <div className="space-y-0.5 min-w-fit">
      {folders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          level={0}
          activeFolderId={activeFolderId}
          onFolderClick={onFolderClick}
          onToggleExpand={onToggleExpand}
          folderExpansions={folderExpansions}
        />
      ))}
    </div>
  );
}

interface FolderTreeComponentProps {
  onCreateFolder: () => void;
}

export function FolderTree({ onCreateFolder }: FolderTreeComponentProps) {
  const { currentWorkspace } = useWorkspace();
  const { currentFolderId, navigateToFolder } = useFolderNavigation();
  const [foldersExpanded, setFoldersExpanded] = useState<boolean>(true);
  const [folderExpansions, setFolderExpansions] = useState<
    Record<string, boolean>
  >({});

  const [foldersData, setFoldersData] = useState<FolderTreeData | null>(null);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<Error | null>(null);

  const cacheKey = currentWorkspace?.id
    ? `folders_${currentWorkspace.id}`
    : null;

  const loadFolders = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setFoldersLoading(true);
    setFoldersError(null);

    try {
      // Step 1: Show cached data immediately for instant UI (if exists)
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          console.log("🚀 Showing cached folders instantly");
          setFoldersData(data);
          setFoldersLoading(false); // Hide loading spinner for cached data
        }
      }

      // Step 2: ALWAYS fetch fresh data from API (even if cache exists)
      console.log("📡 Fetching fresh folders from API...");
      const startTime = Date.now();
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/all?workspace_id=${currentWorkspace.id}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.status}`);
      }

      const freshData = await response.json();
      const endTime = Date.now();
      console.log(`📡 Folders synced in ${endTime - startTime}ms`);

      // Step 3: Update with fresh data
      setFoldersData(freshData);

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
      console.error("Failed to load folders:", error);
      setFoldersError(
        error instanceof Error ? error : new Error("Unknown error"),
      );
    } finally {
      setFoldersLoading(false);
    }
  }, [currentWorkspace?.id, cacheKey]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const buildFolderTree = useCallback(
    (flatFolders: ApiFolderData[]): FolderNode[] => {
      const folderMap = new Map<string, FolderNode>();
      const rootFolders: FolderNode[] = [];

      flatFolders.forEach((folder) => {
        folderMap.set(folder.id, {
          id: folder.id,
          name: folder.name,
          parent_id: folder.parent_id,
          workspace_id: folder.workspace_id,
          children: [],
          expanded: false,
          access_mode: folder.access_mode,
        });
      });

      flatFolders.forEach((folder) => {
        const folderNode = folderMap.get(folder.id);
        if (!folderNode) return;

        if (folder.parent_id) {
          const parentNode = folderMap.get(folder.parent_id);
          if (parentNode) {
            parentNode.children = parentNode.children || [];
            parentNode.children.push(folderNode);
          }
        } else {
          rootFolders.push(folderNode);
        }
      });

      return rootFolders;
    },
    [],
  );

  const folders = useMemo(() => {
    return foldersData?.folders ? buildFolderTree(foldersData.folders) : [];
  }, [foldersData?.folders, buildFolderTree]);

  const handleFolderClick = (folderId: string) => {
    navigateToFolder(folderId);
  };

  const handleToggleExpand = (folderId: string) => {
    setFolderExpansions((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Method to handle folder creation (exposed for parent)
  const handleFolderCreated = useCallback(
    (newFolder: ApiFolderData) => {
      setFoldersData((currentData) => {
        if (!currentData || !currentData.folders) {
          return { folders: [newFolder] };
        }

        const updatedData = {
          ...currentData,
          folders: [...currentData.folders, newFolder],
        };

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

      if (newFolder.parent_id) {
        setFolderExpansions((prev) => ({
          ...prev,
          [newFolder.parent_id!]: true,
        }));
      }
    },
    [cacheKey],
  );

  // Expose handleFolderCreated to parent via ref or callback prop
  useEffect(() => {
    (window as any).__handleFolderCreated = handleFolderCreated;
    return () => {
      delete (window as any).__handleFolderCreated;
    };
  }, [handleFolderCreated]);

  // Expose loadFolders for cache invalidation scenarios (e.g., 404 errors)
  useEffect(() => {
    (window as any).__reloadFolders = loadFolders;
    return () => {
      delete (window as any).__reloadFolders;
    };
  }, [loadFolders]);

  return (
    <div className="mt-4">
      <div className="group px-2 py-1 flex items-center justify-between hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 rounded">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            onClick={() => setFoldersExpanded(!foldersExpanded)}
          >
            {foldersExpanded ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
          </Button>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Folders
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            onClick={onCreateFolder}
          >
            <Plus size={10} />
          </Button>
        </div>
      </div>
      {foldersExpanded && (
        <div className="mt-0.5 min-w-fit">
          {foldersLoading ? (
            <div className="px-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">
              Loading folders...
            </div>
          ) : foldersError ? (
            <div className="px-2 py-2 text-xs text-red-500">
              Failed to load folders
            </div>
          ) : folders.length === 0 ? (
            <div className="px-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">
              No folders yet
            </div>
          ) : (
            <FolderTreeView
              folders={folders}
              activeFolderId={currentFolderId || undefined}
              onFolderClick={handleFolderClick}
              onToggleExpand={handleToggleExpand}
              folderExpansions={folderExpansions}
            />
          )}
        </div>
      )}
    </div>
  );
}
