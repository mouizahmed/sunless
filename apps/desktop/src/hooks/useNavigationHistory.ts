import { useFolderNavigation } from "@/contexts/FolderNavigationContext";

export function useNavigationHistory() {
  const { goBack, canGoBack } = useFolderNavigation();

  const handleBack = () => {
    console.log("🔙 Back button clicked");
    goBack();
  };

  return {
    canGoBack,
    handleBack,
  };
}
