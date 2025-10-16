import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "./ui/sidebar";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { useTopBar } from "@/contexts/TopBarContext";

export function DashboardLayout() {
  const { isOpen } = useSidebar();
  const { setConfig } = useTopBar();
  const { currentFolderId } = useFolderNavigation();

  // Configure TopBar for dashboard
  useEffect(() => {
    setConfig({
      showSearchBar: true,
      showActionButtons: true,
    });
  }, [setConfig]);

  const activeView = currentFolderId ? "folder" : "home";

  return (
    <div className={`flex h-full px-2 pb-2 ${isOpen ? "gap-2" : ""}`}>
      <Sidebar activeView={activeView} />
      <div className="flex-1 overflow-hidden select-none">
        <Outlet />
      </div>
    </div>
  );
}
