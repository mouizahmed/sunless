// React import not needed for modern JSX transform
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";
import Home from "@/pages/Home";
import { FolderContent } from "./FolderContent";

export function DashboardContent() {
  const { currentFolderId } = useFolderNavigation();

  // If no folder is selected, show the home dashboard
  if (!currentFolderId) {
    return <Home />;
  }

  // If a folder is selected, show the folder content
  return (
    <div className="w-full h-full">
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 h-full overflow-hidden">
        <FolderContent className="h-full" />
      </div>
    </div>
  );
}
