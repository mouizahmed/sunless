import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { VisibilitySelector } from "@/components/VisibilitySelector";
import { Link as LinkIcon, Globe, Lock, Users2 } from "lucide-react";

interface SharedUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  access_type: "owner" | "editor" | "viewer";
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "folder" | "note";
  itemName: string;
  workspaceName?: string;
  currentUsers: SharedUser[];
  visibility: "invite_only" | "workspace" | "public";
  linkAccess: "invite_only" | "workspace" | "public";
  onAddUser: (email: string, role: string) => void;
  onRemoveUser: (userId: string) => void;
  onUpdateUserRole: (userId: string, role: string) => void;
  onUpdateVisibility: (visibility: string) => void;
  onUpdateLinkAccess: (access: string) => void;
  onCopyLink: () => void;
}

export function ShareDialog({
  isOpen,
  onClose,
  itemType,
  itemName,
  workspaceName,
  currentUsers,
  visibility,
  linkAccess,
  onAddUser,
  onRemoveUser,
  onUpdateUserRole,
  onUpdateVisibility,
  onUpdateLinkAccess,
  onCopyLink,
}: ShareDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("editor");

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isAddDisabled = !emailInput.trim() || !isValidEmail(emailInput.trim());

  const handleAddUser = () => {
    if (emailInput.trim() && isValidEmail(emailInput.trim())) {
      onAddUser(emailInput.trim(), selectedRole);
      setEmailInput("");
    }
  };

  const linkAccessOptions = [
    {
      value: "invite_only",
      label: "Members only",
      description: "Only invited members can access",
      icon: Lock,
    },
    {
      value: "workspace",
      label: `Everyone in ${workspaceName || "workspace"}`,
      description: `Anyone in ${workspaceName || "the workspace"} can access`,
      icon: Users2,
    },
    {
      value: "public",
      label: "Anyone with the link",
      description: "Anyone with the link can view",
      icon: Globe,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">
            Share "{itemName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add people */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search people or enter emails"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                className="flex-1 h-8 text-xs bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
              />
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddUser}
                disabled={isAddDisabled}
                className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                Add
              </Button>
            </div>
          </div>

          {/* People with access */}
          <div className="space-y-3">
            <Label className="text-sm text-neutral-900 dark:text-neutral-100">
              People with access
            </Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto sidebar-scrollbar">
              {currentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <UserAvatar
                      name={user.name}
                      avatarUrl={user.avatar_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {user.name}{" "}
                        {user.access_type === "owner" && (
                          <span className="text-neutral-500 dark:text-neutral-400">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  {user.access_type === "owner" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="h-8 text-xs text-neutral-600 dark:text-neutral-400 cursor-default"
                    >
                      Owner
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.access_type}
                        onValueChange={(value) =>
                          onUpdateUserRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">
                            Editor
                          </SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveUser(user.id)}
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Visibility settings */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <VisibilitySelector
              value={visibility}
              onChange={onUpdateVisibility}
              itemType={itemType}
              workspaceName={workspaceName}
            />
          </div>

          {/* Link access */}
          <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <Label className="text-sm text-neutral-900 dark:text-neutral-100">
              Link access
            </Label>
            <div className="flex items-center gap-2">
              <Select value={linkAccess} onValueChange={onUpdateLinkAccess}>
                <SelectTrigger className="flex-1 h-8 text-xs bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600">
                  <SelectValue>
                    {linkAccessOptions.find((opt) => opt.value === linkAccess) && (
                      <div className="flex items-center gap-2">
                        {React.createElement(
                          linkAccessOptions.find((opt) => opt.value === linkAccess)!
                            .icon,
                          { className: "w-4 h-4" }
                        )}
                        <span>
                          {
                            linkAccessOptions.find((opt) => opt.value === linkAccess)!
                              .label
                          }
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {linkAccessOptions.map((option) => (
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
              <Button
                variant="outline"
                onClick={onCopyLink}
                className="h-8 px-3 text-xs gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Copy link
              </Button>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {linkAccess === "invite_only" && "Only invited members can access via link"}
              {linkAccess === "workspace" && `Anyone in ${workspaceName || "the workspace"} can access via link`}
              {linkAccess === "public" && "Anyone with the link can view"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
