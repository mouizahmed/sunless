// React import not needed for modern JSX transform
import { Folder } from "@/pages/Folder";
import { useFolderNavigation } from "@/contexts/FolderNavigationContext";

interface FolderContentProps {
  className?: string;
}

export function FolderContent({ className }: FolderContentProps) {
  const { currentFolderId, navigateToFolder } = useFolderNavigation();

  return (
    <div className={className}>
      <Folder
        folderId={currentFolderId}
        onFolderChange={navigateToFolder}
      />
    </div>
  );
}
