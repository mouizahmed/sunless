import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Sidebar, SidebarContent, SidebarFooter } from "./ui/sidebar";
import { Button } from "./ui/button";
import {
  Home,
  FileText,
  Settings,
  Plus,
  LogOut,
  LucideIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Users,
  UserPlus,
  Lock,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { InviteMembersDialog } from "./InviteMembersDialog";

interface NavItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

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

function NavButton({ icon: Icon, label, onClick, isActive }: NavItem) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      className={`w-full justify-start gap-2 py-1 px-2 text-xs h-7 ${
        isActive
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
      }`}
      onClick={onClick}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <Icon size={14} />
      <span>{label}</span>
    </Button>
  );
}

interface FolderTreeItemProps {
  folder: FolderNode;
  level: number;
  activeFolderId?: string;
  onFolderClick: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
}

function FolderTreeItem({
  folder,
  level,
  activeFolderId,
  onFolderClick,
  onToggleExpand,
  folderExpansions,
}: FolderTreeItemProps & { folderExpansions: Record<string, boolean> }) {
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
          style={
            {
              WebkitAppRegion: "no-drag",
            } as React.CSSProperties
          }
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

          {/* Lock icon for invite-only folders */}
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

function FolderTree({
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

interface AppSidebarProps {
  activeView: string;
}

export function AppSidebar({ activeView }: AppSidebarProps) {
  console.log("🔄 AppSidebar render");

  const { user, logout, logoutEverywhere } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } =
    useWorkspace();
  const { currentFolderId, navigateToFolder } = useFolderNavigation();
  const [foldersExpanded, setFoldersExpanded] = useState<boolean>(true);
  const [folderExpansions, setFolderExpansions] = useState<
    Record<string, boolean>
  >({});
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] =
    useState<boolean>(false);
  const [showInviteMembersDialog, setShowInviteMembersDialog] =
    useState<boolean>(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] =
    useState<boolean>(false);

  // Simple state-based cache
  const [foldersData, setFoldersData] = useState<FolderTreeData | null>(null);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<Error | null>(null);

  // Simple cache key for localStorage
  const cacheKey = currentWorkspace?.id
    ? `folders_${currentWorkspace.id}`
    : null;

  // Load folders from cache or API
  const loadFolders = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setFoldersLoading(true);
    setFoldersError(null);

    try {
      // Try cache first
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Cache valid for 10 minutes
          if (Date.now() - timestamp < 10 * 60 * 1000) {
            console.log("🚀 Folders loaded from cache instantly");
            setFoldersData(data);
            setFoldersLoading(false);
            return;
          }
        }
      }

      // Fetch from API
      console.log("📡 Fetching folders from API...");
      const startTime = Date.now();
      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders/all?workspace_id=${currentWorkspace.id}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      console.log(`📡 Folders fetched in ${endTime - startTime}ms`);

      setFoldersData(data);

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
      console.error("Failed to load folders:", error);
      setFoldersError(
        error instanceof Error ? error : new Error("Unknown error"),
      );
    } finally {
      setFoldersLoading(false);
    }
  }, [currentWorkspace?.id, cacheKey]);

  // Load folders when workspace changes
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Helper function to build hierarchical folder tree from flat folder data
  const buildFolderTree = useCallback(
    (flatFolders: ApiFolderData[]): FolderNode[] => {
      const folderMap = new Map<string, FolderNode>();
      const rootFolders: FolderNode[] = [];

      // First pass: create all folder nodes
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

      // Second pass: build hierarchy
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

  // Process cached folder data into tree structure (memoized to prevent infinite renders)
  const folders = useMemo(() => {
    console.log(
      "📁 AppSidebar folders recalculated, data length:",
      foldersData?.folders?.length || 0,
    );
    return foldersData?.folders ? buildFolderTree(foldersData.folders) : [];
  }, [foldersData?.folders, buildFolderTree]);

  const handleFolderClick = (folderId: string) => {
    // Direct folder navigation without URL change to avoid full re-render
    console.log("🌳 AppSidebar handleFolderClick - navigating to:", folderId);
    navigateToFolder(folderId);
  };

  const handleToggleExpand = (folderId: string) => {
    setFolderExpansions((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleFolderCreated = useCallback(
    async (newFolder: ApiFolderData) => {
      console.log("🔄 AppSidebar handleFolderCreated called with:", newFolder);

      // Optimistically update the state
      setFoldersData((currentData) => {
        if (!currentData || !currentData.folders) {
          return { folders: [newFolder] };
        }

        const updatedData = {
          ...currentData,
          folders: [...currentData.folders, newFolder],
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

      // Auto-expand the parent folder if applicable
      if (newFolder.parent_id) {
        setFolderExpansions((prev) => ({
          ...prev,
          [newFolder.parent_id!]: true,
        }));
      }

      console.log("✅ Folder added instantly - no network request needed!");
    },
    [cacheKey],
  );

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: "Home",
      onClick: () => {
        console.log("🏠 Home button clicked - navigating to home");
        navigateToFolder(null); // Reset folder navigation to show home
      },
      isActive: activeView === "home",
    },
    {
      icon: Users,
      label: "Shared with me",
      onClick: () => console.log("Shared with me clicked"),
      isActive: activeView === "shared",
    },
    {
      icon: Calendar,
      label: "Calendar",
      onClick: () => console.log("Calendar clicked"),
      isActive: activeView === "calendar",
    },
  ];

  return (
    <Sidebar className="">
      <SidebarContent>
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <NavButton key={index} {...item} />
          ))}
        </div>

        {/* Folder Tree Section */}
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
                onClick={() => setShowCreateFolderDialog(true)}
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
                <FolderTree
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
      </SidebarContent>

      {user && (
        <SidebarFooter>
          {/* Workspace Dropdown */}
          {!isLoading && (
            <div className="mb-2">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 mt-2 px-2">
                Workspace
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2 py-1.5 h-auto hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-lg"
                    style={
                      { WebkitAppRegion: "no-drag" } as React.CSSProperties
                    }
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="text-xs font-semibold text-white">
                          {currentWorkspace
                            ? currentWorkspace.name.charAt(0).toUpperCase()
                            : "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium truncate text-neutral-900 dark:text-neutral-100">
                          {currentWorkspace
                            ? currentWorkspace.name
                            : "No workspace"}
                        </p>
                        <p className="text-xs text-violet-600 dark:text-violet-400 truncate">
                          {currentWorkspace
                            ? `${currentWorkspace.member_count} member${
                                currentWorkspace.member_count !== 1 ? "s" : ""
                              }`
                            : "Create a workspace"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={12}
                      className="text-violet-500 dark:text-violet-400 flex-shrink-0"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-60 bg-neutral-800 border-neutral-700 text-white"
                >
                  <div className="px-3 py-2 border-b border-neutral-700">
                    <p className="text-sm font-medium text-white">
                      {workspaces.length > 0
                        ? "Switch Workspace"
                        : "Workspaces"}
                    </p>
                  </div>
                  {workspaces.length > 0 ? (
                    workspaces
                      .filter((workspace) => workspace)
                      .map((workspace) => (
                        <DropdownMenuItem
                          key={workspace.id}
                          onClick={() => setCurrentWorkspace(workspace)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${
                            currentWorkspace?.id === workspace.id
                              ? "bg-violet-600 text-white"
                              : "text-neutral-300 hover:bg-neutral-700 hover:text-white"
                          }`}
                          style={
                            {
                              WebkitAppRegion: "no-drag",
                            } as React.CSSProperties
                          }
                        >
                          <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {workspace.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{workspace.name}</p>
                            <p className="text-xs text-neutral-400 truncate">
                              {workspace.member_count} member
                              {workspace.member_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {currentWorkspace?.id === workspace.id && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </DropdownMenuItem>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-neutral-400">
                      No workspaces available
                    </div>
                  )}
                  <DropdownMenuSeparator className="border-neutral-700" />
                  <DropdownMenuItem
                    onClick={() => setShowInviteMembersDialog(true)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                    style={
                      { WebkitAppRegion: "no-drag" } as React.CSSProperties
                    }
                  >
                    <UserPlus size={14} />
                    <span>Invite members</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowCreateWorkspaceDialog(true)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                    style={
                      { WebkitAppRegion: "no-drag" } as React.CSSProperties
                    }
                  >
                    <Plus size={14} />
                    <span>Create workspace</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => console.log("Workspace settings")}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                    style={
                      { WebkitAppRegion: "no-drag" } as React.CSSProperties
                    }
                  >
                    <Settings size={14} />
                    <span>Workspace settings</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* User Profile Dropdown */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between gap-3 px-2 py-1.5 h-auto hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-600"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onLoad={(e) => {
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) {
                            (fallback as HTMLElement).style.display = "none";
                          }
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) {
                            (fallback as HTMLElement).style.display = "flex";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center"
                      style={{
                        display: user.picture ? "none" : "flex",
                      }}
                    >
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate text-neutral-900 dark:text-neutral-100">
                        {user.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Settings
                    size={16}
                    className="text-neutral-400 dark:text-neutral-500 flex-shrink-0"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-60 bg-neutral-800 border-neutral-700 text-white"
              >
                <div className="px-3 py-2 border-b border-neutral-700">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-neutral-400">{user.email}</p>
                </div>
                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <FileText size={14} />
                  <span>Manage templates</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <Plus size={14} />
                  <span>Copy invite link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <Settings size={14} />
                  <span>Help Center</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-neutral-700" />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logoutEverywhere}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                >
                  <LogOut size={14} />
                  <span>Log out everywhere</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
      )}

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog
        isOpen={showCreateWorkspaceDialog}
        onClose={() => setShowCreateWorkspaceDialog(false)}
      />

      {/* Invite Members Dialog */}
      <InviteMembersDialog
        isOpen={showInviteMembersDialog}
        onClose={() => setShowInviteMembersDialog(false)}
        workspaceName={currentWorkspace?.name}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        parentFolderId={currentFolderId || undefined} // Pass current folder as parent
        onFolderCreated={handleFolderCreated}
      />
    </Sidebar>
  );
}
