import { createContext, useContext, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface FolderNavigationContextType {
  currentFolderId: string | null;
  navigateToFolder: (folderId: string | null) => void;
  navigateToNote: (noteId: string) => void;
}

const FolderNavigationContext = createContext<
  FolderNavigationContextType | undefined
>(undefined);

export function useFolderNavigation() {
  const context = useContext(FolderNavigationContext);
  if (!context) {
    throw new Error(
      "useFolderNavigation must be used within a FolderNavigationProvider",
    );
  }
  return context;
}

interface FolderNavigationProviderProps {
  children: ReactNode;
}

export function FolderNavigationProvider({
  children,
}: FolderNavigationProviderProps) {
  const navigate = useNavigate();
  const params = useParams();

  // Derive current folder ID from URL
  const currentFolderId = params.folderId || null;

  const navigateToFolder = (folderId: string | null) => {
    console.log("🧭 Navigating to folder:", folderId);

    if (!folderId) {
      // Navigate to dashboard home
      navigate("/dashboard");
    } else {
      // Navigate to specific folder
      navigate(`/dashboard/folder/${folderId}`);
    }
  };

  const navigateToNote = (noteId: string) => {
    console.log("📝 Navigating to note:", noteId);
    navigate(`/dashboard/note/${noteId}`);
  };

  return (
    <FolderNavigationContext.Provider
      value={{
        currentFolderId,
        navigateToFolder,
        navigateToNote,
      }}
    >
      {children}
    </FolderNavigationContext.Provider>
  );
}
