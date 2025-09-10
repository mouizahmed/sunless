"use client";

import { Button } from "@/components/ui/button";
import { X, Trash, Download, Move } from "lucide-react";

interface BulkAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  disabled?: boolean;
}

interface BulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  actions?: BulkAction[];
  clearLabel?: string;
}

export function BulkActions({ 
  selectedCount, 
  onClear, 
  actions = [], 
  clearLabel 
}: BulkActionsProps) {
  const displayLabel = clearLabel || `${selectedCount} selected`;

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm" onClick={onClear}>
        <X className="w-4 h-4 mr-1" />
        {displayLabel}
      </Button>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "outline"}
          size="sm"
          className={action.className}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Predefined common actions for convenience
export const commonBulkActions = {
  export: (onClick: () => void): BulkAction => ({
    label: "Export",
    icon: <Download className="w-4 h-4 mr-1" />,
    onClick,
  }),
  
  move: (onClick: () => void, disabled = false): BulkAction => ({
    label: "Move", 
    icon: <Move className="w-4 h-4 mr-1" />,
    onClick,
    disabled,
  }),
  
  delete: (onClick: () => void): BulkAction => ({
    label: "Delete",
    icon: <Trash className="w-4 h-4 mr-1" />,
    onClick,
    variant: "outline" as const,
    className: "text-red-600 hover:text-red-700",
  }),
};