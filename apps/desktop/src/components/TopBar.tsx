import React from "react";
import { ArrowLeft, Search, Upload, Video } from "lucide-react";
import { useWindowState } from "@/hooks/useWindowState";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onBack?: () => void;
  onSearch?: () => void;
  onUploadFile?: () => void;
  onNewMeeting?: () => void;
  showBackButton?: boolean;
  showSearchBar?: boolean;
  showActionButtons?: boolean;
  invisible?: boolean;
  showBackOnInvisible?: boolean;
}

function TopBar({
  onBack,
  onSearch,
  onUploadFile,
  onNewMeeting,
  showBackButton = false,
  showSearchBar = false,
  showActionButtons = false,
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
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={onBack}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <ArrowLeft size={16} />
          </Button>
        )}

        {showSearchBar && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-3 py-1"
            onClick={onSearch}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Search size={14} />
            <span>Search</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showActionButtons && (
          <>
            <Button
              className="px-3 py-1 bg-black text-foreground hover:bg-muted/80 rounded-lg flex items-center gap-2 transition-colors"
              onClick={onUploadFile}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Upload size={14} />
              Upload File
            </Button>
            <Button
              className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-2 transition-colors"
              onClick={onNewMeeting}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Video size={14} />
              New Meeting
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default TopBar;
