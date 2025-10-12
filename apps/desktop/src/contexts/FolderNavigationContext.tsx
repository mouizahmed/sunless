import { createContext, useContext, useState, ReactNode } from "react";

interface FolderNavigationContextType {
  currentFolderId: string | null;
  setCurrentFolderId: (folderId: string | null) => void;
  navigateToFolder: (folderId: string | null) => void;
  goBack: () => void;
  canGoBack: boolean;
  navigationHistory: (string | null)[];
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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<(string | null)[]>(
    [null],
  ); // Start with home

  const navigateToFolder = (folderId: string | null) => {
    console.log(
      "🧭 FolderNavigation - navigateToFolder called with:",
      folderId,
    );

    // Don't add duplicate consecutive entries
    if (folderId !== currentFolderId) {
      setNavigationHistory((prev) => [...prev, folderId]);
      console.log("📚 Navigation history updated:", [
        ...navigationHistory,
        folderId,
      ]);
    }

    setCurrentFolderId(folderId);
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current location
      const previousLocation = newHistory[newHistory.length - 1];

      console.log("⬅️ Going back to:", previousLocation);
      console.log("📚 New history:", newHistory);

      setNavigationHistory(newHistory);
      setCurrentFolderId(previousLocation);
    }
  };

  const canGoBack = navigationHistory.length > 1;

  return (
    <FolderNavigationContext.Provider
      value={{
        currentFolderId,
        setCurrentFolderId,
        navigateToFolder,
        goBack,
        canGoBack,
        navigationHistory,
      }}
    >
      {children}
    </FolderNavigationContext.Provider>
  );
}
