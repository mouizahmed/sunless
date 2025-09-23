import React from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useSidebar } from "./ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isOpen } = useSidebar();
  const location = useLocation();

  // Map routes to active views for the sidebar
  const getActiveView = (pathname: string) => {
    switch (pathname) {
      case "/dashboard":
        return "home";
      case "/notes":
        return "notes";
      case "/new-note":
        return "newNote";
      case "/settings":
        return "settings";
      default:
        return "home";
    }
  };

  const activeView = getActiveView(location.pathname);

  return (
    <div className={`flex h-full px-2 pb-2 ${isOpen ? "gap-2" : ""}`}>
      <AppSidebar activeView={activeView} />
      <div className="flex-1 overflow-hidden select-none">{children}</div>
    </div>
  );
}
