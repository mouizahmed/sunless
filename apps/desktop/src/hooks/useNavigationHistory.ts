import { useNavigate, useLocation } from "react-router-dom";

export function useNavigationHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we can go back (not on root dashboard)
  const canGoBack = location.pathname !== "/dashboard" && location.pathname !== "/welcome";

  const handleBack = () => {
    console.log("🔙 Back button clicked");
    navigate(-1); // Use browser history
  };

  return {
    canGoBack,
    handleBack,
  };
}
