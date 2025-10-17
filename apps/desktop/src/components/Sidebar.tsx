import { useState } from "react";
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
} from "./ui/sidebar";
import { Button } from "./ui/button";
import { Home, Users, Calendar, FileText, LucideIcon } from "lucide-react";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { useNavigate } from "react-router-dom";
import { CreateWorkspaceDialog } from "./dialog/CreateWorkspaceDialog";
import { CreateFolderDialog } from "./dialog/CreateFolderDialog";
import { InviteMembersDialog } from "./dialog/InviteMembersDialog";
import { FolderTree } from "./FolderTree";
import { WorkspaceDropdown } from "./dropdown/WorkspaceDropdown";
import { UserProfileDropdown } from "./dropdown/UserProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { dispatchFolderCreated, type FolderCreatedDetail } from "@/events/folderEvents";

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
  const { navigateToFolder } = useFolderNavigation();
  const navigate = useNavigate();
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
      icon: FileText,
      label: "All Files",
      onClick: () => navigate("/dashboard/allfiles"),
      isActive: activeView === "allfiles",
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

  const handleFolderCreated = (newFolder: FolderCreatedDetail) => {
    // Dispatch folder created event
    dispatchFolderCreated(newFolder);
  };

  return (
    <SidebarContainer className="">
      <SidebarContent>
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <NavButton key={index} {...item} />
          ))}
        </div>

        <FolderTree onCreateFolder={() => setShowCreateFolderDialog(true)} />
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
        onFolderCreated={handleFolderCreated}
      />
    </SidebarContainer>
  );
}
