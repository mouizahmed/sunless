import { Button } from "../ui/button";
import { ChevronDown, Plus, UserPlus, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useWorkspace } from "@/hooks/useWorkspace";

interface WorkspaceDropdownProps {
  onCreateWorkspace: () => void;
  onInviteMembers: () => void;
}

export function WorkspaceDropdown({
  onCreateWorkspace,
  onInviteMembers,
}: WorkspaceDropdownProps) {
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } =
    useWorkspace();

  if (isLoading) return null;

  return (
    <div className="mb-2">
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 mt-2 px-2">
        Workspace
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2 py-1.5 h-auto hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-lg"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
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
                  {currentWorkspace ? currentWorkspace.name : "No workspace"}
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
              {workspaces.length > 0 ? "Switch Workspace" : "Workspaces"}
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
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
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
            onClick={onInviteMembers}
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <UserPlus size={14} />
            <span>Invite members</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onCreateWorkspace}
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Plus size={14} />
            <span>Create workspace</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => console.log("Workspace settings")}
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Settings size={14} />
            <span>Workspace settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
