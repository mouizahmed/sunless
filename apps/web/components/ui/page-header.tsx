"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
  loading?: boolean;
  loadingLeftWidth?: string;
  loadingRightWidths?: string[];
}

export function PageHeader({ 
  leftContent, 
  rightContent, 
  children, 
  loading = false,
  loadingLeftWidth = "w-20",
  loadingRightWidths = ["w-32", "w-24"]
}: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
        <SidebarTrigger className="shrink-0 md:hidden" />
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          {loading ? (
            <>
              <div className="animate-pulse flex items-center gap-2">
                <div className={`h-4 bg-muted rounded ${loadingLeftWidth}`}></div>
              </div>
              <div className="animate-pulse flex items-center gap-2">
                {loadingRightWidths.map((width, index) => (
                  <div key={index} className={`h-8 bg-muted rounded ${width}`}></div>
                ))}
              </div>
            </>
          ) : (
            <>
              {leftContent && (
                <div className="flex items-center gap-2">
                  {leftContent}
                </div>
              )}
              
              {children && (
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  {children}
                </div>
              )}
              
              {rightContent && (
                <div className="flex items-center gap-2">
                  {rightContent}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}