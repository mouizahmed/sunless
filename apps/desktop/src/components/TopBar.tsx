import React from "react";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { useWindowState } from "@/hooks/useWindowState";

interface TopBarProps {
  onBack?: () => void;
  onSearch?: () => void;
  onNewNote?: () => void;
  showBackButton?: boolean;
  showSearchBar?: boolean;
  showNewNoteButton?: boolean;
  invisible?: boolean;
  showBackOnInvisible?: boolean;
}

function TopBar({
  onBack,
  onSearch,
  onNewNote,
  showBackButton = false,
  showSearchBar = false,
  showNewNoteButton = false,
}: TopBarProps) {
  const isMacOS = navigator.platform.toLowerCase().includes("mac");
  const { isMaximized } = useWindowState();

  return (
    <div
      className="h-12 w-full flex items-center justify-between px-4 text-white text-sm absolute top-0 left-0 z-40 bg-background"
      style={
        {
          WebkitAppRegion: "drag",
          paddingLeft: isMacOS && !isMaximized ? "80px" : "16px",
          paddingRight: !isMacOS && !isMaximized ? "140px" : "16px",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            className="p-1 hover:bg-gray-700 rounded"
            onClick={onBack}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {showSearchBar && (
          <button
            className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-md hover:bg-gray-700"
            onClick={onSearch}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Search size={14} />
            <span>Search</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showNewNoteButton && (
          <button
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-white flex items-center gap-2"
            onClick={onNewNote}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Plus size={14} />
            New Note
          </button>
        )}
      </div>
    </div>
  );
}

export default TopBar;
