import { Button } from "./ui/button";
import {
  Settings,
  FileText,
  LogOut,
  CircleQuestionMark,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export function UserProfileDropdown() {
  const { user, logout, logoutEverywhere } = useAuth();

  if (!user) return null;

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between gap-3 px-2 py-1.5 h-auto hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-600"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onLoad={(e) => {
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) {
                      (fallback as HTMLElement).style.display = "none";
                    }
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) {
                      (fallback as HTMLElement).style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div
                className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center"
                style={{
                  display: user.picture ? "none" : "flex",
                }}
              >
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate text-neutral-900 dark:text-neutral-100">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Settings
              size={16}
              className="text-neutral-400 dark:text-neutral-500 flex-shrink-0"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-60 bg-neutral-800 border-neutral-700 text-white"
        >
          <div className="px-3 py-2 border-b border-neutral-700">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>
          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <FileText size={14} />
            <span>Manage templates</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <CircleQuestionMark size={14} />
            <span>Help Center</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Settings size={14} />
            <span>Settings</span>
          </DropdownMenuItem>
          <div className="border-t border-neutral-700 mt-1 pt-1" />
          <DropdownMenuItem
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <LogOut size={14} />
            <span>Log out</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={logoutEverywhere}
            className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <LogOut size={14} />
            <span>Log out everywhere</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
