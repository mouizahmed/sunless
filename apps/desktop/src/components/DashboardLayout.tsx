import React from "react";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-full">
      <AppSidebar />
      <div className="flex-1 overflow-hidden px-2 pb-2">
        {children}
      </div>
    </div>
  );
}