// React import not needed for modern JSX transform
import {
  Folder,
  FileText,
  FileAudio,
  FileVideo,
  Lock,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderContentItemProps {
  item: {
    id: string;
    name: string;
    type: "folder" | "file";
    size?: number;
    length?: string;
    created_at: string;
    updated_at: string;
    access_mode?: "workspace" | "invite_only";
  };
  onFolderClick?: (folderId: string) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string, name: string) => void;
  onMove?: (id: string, name: string) => void;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "folder":
      return (
        <Folder className="w-5 h-5 text-violet-600 dark:text-violet-400" />
      );
    case "audio":
      return <FileAudio className="w-5 h-5 text-purple-500" />;
    case "video":
      return <FileVideo className="w-5 h-5 text-green-500" />;
    default:
      return <FileText className="w-5 h-5 text-neutral-500" />;
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffInHours < 24 * 7) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
};

const getDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return "Today";
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else if (diffInHours < 24 * 7) {
    return "This week";
  } else {
    return "Older";
  }
};

export function FolderContentItem({
  item,
  onFolderClick,
  onRename,
  onDelete,
  onMove,
}: FolderContentItemProps) {
  const handleClick = () => {
    if (item.type === "folder" && onFolderClick) {
      onFolderClick(item.id);
    }
  };

  const handleRename = () => {
    onRename?.(item.id, item.name);
  };

  const handleDelete = () => {
    onDelete?.(item.id, item.name);
  };

  const handleMove = () => {
    onMove?.(item.id, item.name);
  };

  return (
    <div className="group flex items-center justify-between p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
      {/* Left side - Icon, Name, and Details */}
      <div
        className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
        onClick={handleClick}
      >
        {/* File/Folder Icon */}
        <div className="flex-shrink-0">{getFileIcon(item.type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {item.name}
            </h3>

            {/* Lock icon for invite-only folders */}
            {item.type === "folder" && item.access_mode === "invite_only" && (
              <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {/* Date */}
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(item.created_at)}</span>
            </div>

            {/* File size or length */}
            {item.type === "file" && (
              <>
                {item.size && <span>{formatFileSize(item.size)}</span>}
                {item.length && <span>{item.length}</span>}
              </>
            )}

            {item.type === "folder" && <span>Folder</span>}
          </div>
        </div>
      </div>

      {/* Right side - Date label and Actions */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {/* Date category label */}
        <div className="hidden sm:block text-xs text-neutral-400 dark:text-neutral-500 font-medium">
          {getDateLabel(item.created_at)}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={handleMove}>Move</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
