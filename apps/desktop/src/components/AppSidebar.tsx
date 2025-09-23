import React, { useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter } from "./ui/sidebar";
import { Button } from "./ui/button";
import {
  Home,
  FileText,
  Settings,
  Plus,
  ChevronsUpDown,
  LogOut,
  LucideIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
  expanded?: boolean;
}

// Sample folder data - in a real app this would come from API/state
const sampleFolders: FolderNode[] = [
  {
    id: "1",
    name: "Personal Projects",
    expanded: false,
    children: [
      { id: "2", name: "Website Redesign" },
      { id: "3", name: "Mobile App Ideas" },
      {
        id: "10",
        name: "Learning Resources",
        expanded: false,
        children: [
          { id: "11", name: "React Tutorials" },
          { id: "12", name: "Design Patterns" },
          {
            id: "13",
            name: "Advanced Topics",
            expanded: false,
            children: [
              { id: "14", name: "Performance Optimization" },
              { id: "15", name: "State Management" },
              { id: "16", name: "Testing Strategies" },
            ]
          }
        ]
      },
    ],
  },
  {
    id: "4",
    name: "Work Documents",
    expanded: false,
    children: [
      { id: "5", name: "Meeting Notes" },
      {
        id: "6",
        name: "Deep Nested Project",
        expanded: false,
        children: [
          {
            id: "7",
            name: "Level 1",
            expanded: false,
            children: [
              {
                id: "8",
                name: "Level 2",
                expanded: false,
                children: [
                  {
                    id: "17",
                    name: "Level 3",
                    expanded: false,
                    children: [
                      {
                        id: "18",
                        name: "Level 4",
                        expanded: false,
                        children: [
                          {
                            id: "19",
                            name: "Level 5",
                            expanded: false,
                            children: [
                              {
                                id: "20",
                                name: "Level 6",
                                expanded: false,
                                children: [
                                  {
                                    id: "21",
                                    name: "Level 7",
                                    expanded: false,
                                    children: [
                                      {
                                        id: "22",
                                        name: "Level 8",
                                        expanded: false,
                                        children: [
                                          {
                                            id: "23",
                                            name: "Final Document A",
                                            expanded: false,
                                            children: [
                                              { id: "34", name: "Section 1" },
                                              { id: "35", name: "Section 2" },
                                              { id: "36", name: "Appendix" },
                                            ]
                                          },
                                          { id: "24", name: "Final Document B" },
                                          { id: "25", name: "Final Document C" },
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "28",
        name: "Project Management",
        expanded: false,
        children: [
          { id: "29", name: "Sprints" },
          { id: "30", name: "Roadmaps" },
          { id: "31", name: "Team Resources" },
        ]
      }
    ],
  },
  {
    id: "9",
    name: "Archive",
    expanded: false,
    children: [
      { id: "32", name: "2023 Projects" },
      { id: "33", name: "Old Presentations" },
    ]
  },
];

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
}: FolderTreeItemProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = activeFolderId === folder.id;
  const isExpanded = folder.expanded;

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
          style={{
            WebkitAppRegion: "no-drag",
          } as React.CSSProperties}
          onClick={() => onFolderClick(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder.id);
              }}
              className="flex items-center justify-center w-4 h-4 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          {isExpanded && hasChildren ? (
            <FolderOpen size={14} className="text-violet-600 dark:text-violet-400" />
          ) : (
            <Folder size={14} className="text-violet-600 dark:text-violet-400" />
          )}

          <span className="truncate">{folder.name}</span>
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
}

function FolderTree({
  folders,
  activeFolderId,
  onFolderClick,
  onToggleExpand,
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
        />
      ))}
    </div>
  );
}

interface AppSidebarProps {
  activeView: string;
}

export function AppSidebar({ activeView }: AppSidebarProps) {
  const { user, logout, logoutEverywhere } = useAuth();
  const [folders, setFolders] = useState<FolderNode[]>(sampleFolders);
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>();
  const [foldersExpanded, setFoldersExpanded] = useState<boolean>(true);

  const handleFolderClick = (folderId: string) => {
    setActiveFolderId(folderId);
    console.log("Navigate to folder:", folderId);
    // In a real app, this would navigate to the folder route
  };

  const handleToggleExpand = (folderId: string) => {
    const updateFolderExpansion = (folderList: FolderNode[]): FolderNode[] => {
      return folderList.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, expanded: !folder.expanded };
        }
        if (folder.children) {
          return { ...folder, children: updateFolderExpansion(folder.children) };
        }
        return folder;
      });
    };

    setFolders(updateFolderExpansion);
  };

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: "Home",
      onClick: () => console.log("Home clicked"),
      isActive: activeView === "home",
    },
    {
      icon: Users,
      label: "Shared with me",
      onClick: () => console.log("Shared with me clicked"),
      isActive: activeView === "shared",
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
                onClick={() => console.log("Add folder clicked")}
              >
                <Plus size={10} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                onClick={() => console.log("Browse folders clicked")}
              >
                <Grid3X3 size={10} />
              </Button>
            </div>
          </div>
          {foldersExpanded && (
            <div className="mt-0.5 min-w-fit">
              <FolderTree
                folders={folders}
                activeFolderId={activeFolderId}
                onFolderClick={handleFolderClick}
                onToggleExpand={handleToggleExpand}
              />
            </div>
          )}
        </div>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 p-2 h-auto hover:bg-neutral-100 dark:hover:bg-neutral-700"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 flex-1">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt="Profile"
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <ChevronsUpDown size={12} className="text-neutral-400" />
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
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
