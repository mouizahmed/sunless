import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Users2, Globe, LucideIcon } from "lucide-react";

interface VisibilityOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface VisibilitySelectorProps {
  value: "invite_only" | "workspace" | "public";
  onChange: (value: string) => void;
  itemType: "folder" | "note";
  workspaceName?: string;
  disabled?: boolean;
}

export function VisibilitySelector({
  value,
  onChange,
  itemType,
  workspaceName,
  disabled = false,
}: VisibilitySelectorProps) {
  const visibilityOptions: VisibilityOption[] = [
    {
      value: "invite_only",
      label: "Members only",
      description: `Only people added to this ${itemType} can access it`,
      icon: Lock,
    },
    {
      value: "workspace",
      label: workspaceName || "Workspace",
      description: `Everyone in ${workspaceName || "the workspace"} can access`,
      icon: Users2,
    },
    {
      value: "public",
      label: "Public",
      description: `Anyone with the link can access this ${itemType}`,
      icon: Globe,
    },
  ];

  const selectedOption = visibilityOptions.find((opt) => opt.value === value);

  return (
    <div className="space-y-3">
      <Label className="text-sm text-neutral-900 dark:text-neutral-100">
        {itemType === "folder" ? "Folder" : "Note"} visibility
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full h-8 text-xs bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600">
          <SelectValue>
            {selectedOption && (
              <div className="flex items-center gap-2">
                {React.createElement(selectedOption.icon, {
                  className: "w-4 h-4",
                })}
                <span>{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {visibilityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="w-4 h-4" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-neutral-500">
                    {option.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-start gap-2">
        {value === "invite_only" ? (
          <>
            <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Only people added to this {itemType} can access it</span>
          </>
        ) : value === "workspace" ? (
          <>
            <Users2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Everyone in {workspaceName || "the workspace"} can access</span>
          </>
        ) : (
          <>
            <Globe className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Anyone with the link can access this {itemType}</span>
          </>
        )}
      </div>
    </div>
  );
}
