// React import not needed for modern JSX transform
import { FolderView } from "./FolderView";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";

interface FolderContentProps {
  className?: string;
}

export function FolderContent({ className }: FolderContentProps) {
  const { currentFolderId, navigateToFolder } = useFolderNavigation();

  return (
    <div className={className}>
      <FolderView
        folderId={currentFolderId}
        onFolderChange={navigateToFolder}
      />
    </div>
  );
}
