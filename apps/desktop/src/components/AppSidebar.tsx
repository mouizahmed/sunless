import React from "react";
import { Sidebar, SidebarContent, SidebarFooter } from "./ui/sidebar";
import { Button } from "./ui/button";
import {
  Home,
  FileText,
  Settings,
  Plus,
  ChevronsUpDown,
  LogOut,
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

function NavButton({ icon: Icon, label, onClick, isActive }: NavItem) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      className="w-full justify-start gap-2 py-1.5 px-2 text-xs h-8 hover:bg-neutral-100 dark:hover:bg-neutral-700"
      onClick={onClick}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <Icon size={14} />
      <span>{label}</span>
    </Button>
  );
}

export function AppSidebar() {
  const { user, logout, logoutEverywhere } = useAuth();
  const navItems: NavItem[] = [
    {
      icon: Home,
      label: "Dashboard",
      onClick: () => console.log("Dashboard clicked"),
      isActive: true,
    },
    {
      icon: FileText,
      label: "Notes",
      onClick: () => console.log("Notes clicked"),
    },
    {
      icon: Plus,
      label: "New Note",
      onClick: () => console.log("New Note clicked"),
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => console.log("Settings clicked"),
    },
  ];

  return (
    <Sidebar className="">
      <SidebarContent>
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <NavButton key={index} {...item} />
          ))}
        </div>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 p-2 h-auto hover:bg-neutral-100 dark:hover:bg-neutral-700"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 flex-1">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt="Profile"
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{user.name}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <ChevronsUpDown size={12} className="text-neutral-400" />
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
                <Plus size={14} />
                <span>Copy invite link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <Settings size={14} />
                <span>Help Center</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <Settings size={14} />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="border-neutral-700" />
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
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
