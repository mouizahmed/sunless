import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "./ui/sidebar";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import { DashboardContent } from "./DashboardContent";

export function DashboardLayout() {
  const { isOpen } = useSidebar();
  const location = useLocation();
  const { navigateToFolder } = useFolderNavigation();

  // Initialize to dashboard home on mount
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      navigateToFolder(null);
    }
  }, []); // Only run once on mount

  const { currentFolderId } = useFolderNavigation();
  const activeView = currentFolderId ? "folder" : "home";

  return (
    <div className={`flex h-full px-2 pb-2 ${isOpen ? "gap-2" : ""}`}>
      <Sidebar activeView={activeView} />
      <div className="flex-1 overflow-hidden select-none">
        <DashboardContent />
      </div>
    </div>
  );
}
