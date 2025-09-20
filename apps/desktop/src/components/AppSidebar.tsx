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
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <ChevronsUpDown size={12} className="text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <LogOut size={14} />
                <span>Log out</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logoutEverywhere}
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
