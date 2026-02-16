import { useState, useEffect } from 'react';

export function useWindowState() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Check if window is maximized by comparing with screen dimensions
      const isMaximizedState =
        window.innerHeight >= screen.height - 100 &&
        window.innerWidth >= screen.width - 100;
      setIsMaximized(isMaximizedState);
    };

    handleResize(); // Check initial state
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMaximized };
}