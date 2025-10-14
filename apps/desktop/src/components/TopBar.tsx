import React from "react";
import { ArrowLeft, Search, Upload } from "lucide-react";
import { useWindowState } from "@/hooks/useWindowState";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TopBarProps {
  onBack?: () => void;
  showBackButton?: boolean;
  showSearchBar?: boolean;
  showActionButtons?: boolean;
}

function TopBar({
  onBack,
  showBackButton = false,
  showSearchBar = false,
  showActionButtons = false,
}: TopBarProps) {
  const isMacOS = window.env?.platform === "darwin";
  const { isMaximized } = useWindowState();

  const handleSearch = () => {
    console.log("Search clicked");
  };

  const handleUploadFile = () => {
    console.log("Upload File clicked");
  };

  const handleNewMeeting = () => {
    console.log("New Meeting clicked");
  };

  return (
    <div
      className="w-full flex items-center justify-between text-sm py-1 px-2"
      style={
        {
          WebkitAppRegion: "drag",
          paddingLeft: isMacOS && !isMaximized ? "80px" : undefined,
          paddingRight: !isMacOS ? "140px" : undefined,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2">
        <img src="./logo.png" alt="Sunless Logo" className="w-6 h-6" />
        <SidebarTrigger />

        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={onBack}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <ArrowLeft size={14} />
          </Button>
        )}

        {showSearchBar && (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={handleSearch}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Search size={12} />
            <span>Search</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {showActionButtons && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={handleUploadFile}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Upload size={12} />
            </Button>
            <Button
              variant="default"
              className="px-2 py-1 h-auto rounded-md bg-violet-600 text-white hover:bg-violet-700 text-xs"
              onClick={handleNewMeeting}
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              Start a Session
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default TopBar;
