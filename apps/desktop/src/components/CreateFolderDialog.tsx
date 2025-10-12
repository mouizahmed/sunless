import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AccessSelector } from "@/components/ui/access-selector";
import { useWorkspace } from "@/hooks/useWorkspace";
import { makeAuthenticatedApiCall } from "@/utils/firebase-api";

interface FolderData {
  id: string;
  name: string;
  parent_id?: string;
  workspace_id: string;
  access_mode: "workspace" | "invite_only";
  created_at: string;
  updated_at: string;
}

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  parentFolderId?: string;
  onFolderCreated?: (newFolder: FolderData) => void;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  parentFolderId,
  onFolderCreated,
}: CreateFolderDialogProps) {
  console.log("📁 CreateFolderDialog - parentFolderId:", parentFolderId);

  const { currentWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [accessMode, setAccessMode] = useState<"workspace" | "invite_only">(
    "workspace",
  );
  const [inheritSettings, setInheritSettings] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    if (!currentWorkspace) {
      setError("No workspace selected");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await makeAuthenticatedApiCall(
        `http://localhost:8080/api/folders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            parent_id: parentFolderId || null,
            workspace_id: currentWorkspace.id,
            access_mode: accessMode,
            inherit_settings: inheritSettings,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create folder");
      }

      const createdFolder = await response.json();
      console.log(
        "✅ CreateFolderDialog - folder created successfully:",
        createdFolder,
      );

      // Notify parent component about the new folder
      if (onFolderCreated) {
        console.log(
          "🔄 CreateFolderDialog - calling onFolderCreated callback...",
        );
        onFolderCreated(createdFolder);
        console.log(
          "🔄 CreateFolderDialog - onFolderCreated callback completed",
        );
      } else {
        console.log(
          "⚠️ CreateFolderDialog - no onFolderCreated callback provided",
        );
      }

      // Close dialog and reset form on successful creation
      onClose?.();
      setName("");
      setAccessMode("workspace");
      setInheritSettings(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">
            Create folder
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            Create a new folder to organize your files.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="folder-name"
              className="text-neutral-900 dark:text-neutral-100"
            >
              Folder name
            </Label>
            <Input
              id="folder-name"
              placeholder="e.g., Meeting Notes, Documents"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              autoFocus
              className="bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
            />
          </div>

          {/* Access Control Settings */}
          <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <div className="space-y-3">
              <Label
                htmlFor="access-mode"
                className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Folder Access
              </Label>
              <AccessSelector
                value={accessMode}
                onChange={(value: string) =>
                  setAccessMode(value as "workspace" | "invite_only")
                }
                type="folder-access"
                disabled={creating}
              />
            </div>

            {parentFolderId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label
                      htmlFor="inherit-settings"
                      className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                    >
                      Inherit from parent folder
                    </Label>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      Use the same access settings as the parent folder
                    </div>
                  </div>
                  <Switch
                    id="inherit-settings"
                    checked={inheritSettings}
                    onCheckedChange={(checked) => {
                      console.log("🔄 Switch changed to:", checked);
                      setInheritSettings(checked);
                    }}
                    disabled={creating}
                  />
                </div>
                {inheritSettings && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    When enabled, this folder will inherit access settings from
                    its parent folder, overriding the access mode setting above.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                📁 Debug: No parentFolderId provided - inheritance options
                hidden
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={creating}
              className="border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {creating ? "Creating..." : "Create folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
