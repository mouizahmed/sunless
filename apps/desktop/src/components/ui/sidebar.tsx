import React, { createContext, useContext, useState } from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export function useSidebarOptional() {
  return useContext(SidebarContext);
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    console.log("Toggle called, current state:", isOpen);
    setIsOpen(!isOpen);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  const { isOpen } = useSidebar();

  console.log("Sidebar render, isOpen:", isOpen);

  return (
    <div
      className={cn(
        "transition-all duration-200 ease-in-out select-none",
        isOpen ? "w-56" : "w-0",
        className,
      )}
    >
      <div className="h-full flex flex-col select-none">{children}</div>
    </div>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const sidebarContext = useSidebarOptional();

  // Don't render if not within SidebarProvider
  if (!sidebarContext) {
    return null;
  }

  const { toggle } = sidebarContext;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        console.log("Sidebar toggle clicked");
        toggle();
      }}
      className={cn(
        "flex items-center gap-2 px-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800",
        className,
      )}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <PanelLeft size={14} />
    </Button>
  );
}

export function SidebarHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-3 border-b border-neutral-200 dark:border-neutral-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto overflow-x-auto sidebar-scrollbar", className)}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgb(163 163 163) transparent',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-neutral-200 dark:border-neutral-800",
        className,
      )}
    >
      {children}
    </div>
  );
}
