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
  const isMacOS = window.env?.platform === "darwin";
  const { isMaximized } = useWindowState();

  return (
    <div
      className="h-12 w-full flex items-center justify-between px-4 text-sm absolute top-0 left-0 z-40"
      style={
        {
          WebkitAppRegion: "drag",
          paddingLeft: isMacOS && !isMaximized ? "80px" : "16px",
          paddingRight: !isMacOS ? "140px" : "16px",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button
            className="p-1 text-foreground hover:bg-muted rounded transition-colors"
            onClick={onBack}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {showSearchBar && (
          <button
            className="flex items-center gap-2 bg-muted text-foreground px-3 py-1 rounded-md hover:bg-muted/80 transition-colors"
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
            className="px-3 py-1 bg-muted text-foreground hover:bg-muted/80 rounded-lg flex items-center gap-2 transition-colors"
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
