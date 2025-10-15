import { useState } from "react";
import { Sidebar as SidebarContainer, SidebarContent, SidebarFooter } from "./ui/sidebar";
import { Button } from "./ui/button";
import {
  Home,
  Users,
  Calendar,
  LucideIcon,
} from "lucide-react";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { CreateWorkspaceDialog } from "./dialogs/CreateWorkspaceDialog";
import { CreateFolderDialog } from "./dialogs/CreateFolderDialog";
import { InviteMembersDialog } from "./dialogs/InviteMembersDialog";
import { FolderTree } from "./FolderTree";
import { WorkspaceDropdown } from "./WorkspaceDropdown";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";

interface NavItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
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

interface SidebarProps {
  activeView: string;
}

export function Sidebar({ activeView }: SidebarProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { currentFolderId, navigateToFolder } = useFolderNavigation();
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] =
    useState<boolean>(false);
  const [showInviteMembersDialog, setShowInviteMembersDialog] =
    useState<boolean>(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] =
    useState<boolean>(false);

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: "Home",
      onClick: () => {
        navigateToFolder(null);
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

  const handleFolderCreated = (newFolder: any) => {
    // Use the exposed function from FolderTreeSection
    if ((window as any).__handleFolderCreated) {
      (window as any).__handleFolderCreated(newFolder);
    }
  };

  return (
    <SidebarContainer className="">
      <SidebarContent>
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <NavButton key={index} {...item} />
          ))}
        </div>

        <FolderTree
          onCreateFolder={() => setShowCreateFolderDialog(true)}
        />
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <WorkspaceDropdown
            onCreateWorkspace={() => setShowCreateWorkspaceDialog(true)}
            onInviteMembers={() => setShowInviteMembersDialog(true)}
          />
          <UserProfileDropdown />
        </SidebarFooter>
      )}

      {/* Dialogs */}
      <CreateWorkspaceDialog
        isOpen={showCreateWorkspaceDialog}
        onClose={() => setShowCreateWorkspaceDialog(false)}
      />

      <InviteMembersDialog
        isOpen={showInviteMembersDialog}
        onClose={() => setShowInviteMembersDialog(false)}
        workspaceName={currentWorkspace?.name}
      />

      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        parentFolderId={currentFolderId || undefined}
        onFolderCreated={handleFolderCreated}
      />
    </SidebarContainer>
  );
}
