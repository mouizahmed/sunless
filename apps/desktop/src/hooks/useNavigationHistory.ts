import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useNavigationHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Track navigation history
  useEffect(() => {
    setNavigationHistory(prev => {
      const newHistory = [...prev, location.pathname];
      // Keep only unique consecutive paths to avoid duplicates
      if (newHistory.length > 1 && newHistory[newHistory.length - 1] === newHistory[newHistory.length - 2]) {
        return prev;
      }
      return newHistory;
    });
  }, [location.pathname]);

  const handleBack = () => {
    navigate(-1);
    // Remove current page from history when going back
    setNavigationHistory(prev => prev.slice(0, -1));
  };

  // Check if user can go back based on our tracked history
  const canGoBack = navigationHistory.length > 1;

  return {
    canGoBack,
    handleBack,
    navigationHistory,
  };
}