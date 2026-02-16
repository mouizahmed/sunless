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
import { useWorkspace } from "@/hooks/useWorkspace";

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function CreateWorkspaceDialog({ isOpen, onClose }: CreateWorkspaceDialogProps) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Close dialog and reset form on successful creation
      onClose?.();
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md [&>button]:hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">
            Create workspace
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            Workspaces help you organize your content and collaborate with others.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-neutral-900 dark:text-neutral-100">
              Workspace name
            </Label>
            <Input
              id="workspace-name"
              placeholder="e.g., Personal, Work, Team Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              autoFocus
              className="bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              A unique URL will be automatically generated for your workspace.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-description" className="text-neutral-900 dark:text-neutral-100">
              Description (optional)
            </Label>
            <Input
              id="workspace-description"
              placeholder="Describe what this workspace is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creating}
              className="bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}