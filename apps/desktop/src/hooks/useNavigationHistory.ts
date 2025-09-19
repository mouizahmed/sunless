import { useNavigate } from 'react-router-dom';

export function useNavigationHistory() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  // Check if user can go back using browser history
  const canGoBack = window.history.length > 1;

  return {
    canGoBack,
    handleBack,
  };
}