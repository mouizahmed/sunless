import React from 'react';

interface AppBarProps {
  children?: React.ReactNode;
}

function AppBar({ children }: AppBarProps) {
  const handleMinimize = () => {
    // @ts-ignore
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    // @ts-ignore
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    // @ts-ignore
    window.electronAPI?.close();
  };

  return (
    <div 
      className="flex items-center justify-between h-8 bg-background"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-4 flex-1">
        {children}
      </div>
      
      <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="w-12 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="text-xs">−</span>
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span className="text-xs">□</span>
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-8 flex items-center justify-center hover:bg-red-500 text-black dark:text-white hover:text-white"
        >
          <span className="text-xs">×</span>
        </button>
      </div>
    </div>
  );
}

export default AppBar;