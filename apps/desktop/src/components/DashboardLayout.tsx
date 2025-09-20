import React from "react";
import { AppSidebar } from "./AppSidebar";
import { useSidebar } from "./ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isOpen } = useSidebar();

  return (
    <div className={`flex h-full px-2 pb-2 ${isOpen ? "gap-2" : ""}`}>
      <AppSidebar />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
