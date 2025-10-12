import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/contexts/AuthContext";
// LogOut icon removed - not used

export function CreateWorkspaceScreen() {
  const { createWorkspace } = useWorkspace();
  const { logout, logoutEverywhere } = useAuth();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
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

        // Screen will disappear automatically when workspace is created
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create workspace",
        );
      } finally {
        setCreating(false);
      }
    } else {
      // Handle join workspace
      if (!joinUrl.trim()) {
        setError("Workspace URL is required");
        return;
      }

      try {
        setCreating(true);
        setError(null);

        // TODO: Implement join workspace API call
        console.log("Join workspace:", joinUrl.trim());
        setError("Join workspace functionality not implemented yet");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to join workspace",
        );
      } finally {
        setCreating(false);
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center p-4"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="w-full max-w-md">
        {/* Main content */}
        <div
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 shadow-lg"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              {mode === "create" ? "Create your workspace" : "Join a workspace"}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {mode === "create"
                ? "Create a new workspace to organize your content and collaborate with others."
                : "Enter the workspace URL you received to join an existing workspace."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "join" ? (
              // Join workspace form
              <div className="space-y-2">
                <Label
                  htmlFor="join-url"
                  className="text-neutral-900 dark:text-neutral-100"
                >
                  Workspace URL
                </Label>
                <Input
                  id="join-url"
                  placeholder="workspace-name"
                  value={joinUrl}
                  onChange={(e) => setJoinUrl(e.target.value)}
                  disabled={creating}
                  required
                  autoFocus
                  className="bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Enter the workspace URL you received in your invitation.
                </p>
              </div>
            ) : (
              // Create workspace form
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="workspace-name"
                    className="text-neutral-900 dark:text-neutral-100"
                  >
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
                    A unique URL will be automatically generated for your
                    workspace.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="workspace-description"
                    className="text-neutral-900 dark:text-neutral-100"
                  >
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
              </>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                disabled={
                  creating ||
                  (mode === "create" ? !name.trim() : !joinUrl.trim())
                }
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {creating
                  ? mode === "create"
                    ? "Creating..."
                    : "Joining..."
                  : mode === "create"
                  ? "Create workspace"
                  : "Join workspace"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-500 dark:text-neutral-400">
                    Or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setMode(mode === "create" ? "join" : "create")}
                disabled={creating}
                className="w-full border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                {mode === "create"
                  ? "Join existing workspace"
                  : "Create new workspace"}
              </Button>
            </div>
          </form>
        </div>

        {/* Logout buttons under the box */}
        <div className="flex justify-center gap-6 mt-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Logout button clicked");
              logout();
            }}
            disabled={creating}
            className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 text-sm underline underline-offset-2 hover:no-underline transition-colors disabled:opacity-50"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            Log out
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Logout everywhere button clicked");
              logoutEverywhere();
            }}
            disabled={creating}
            className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 text-sm underline underline-offset-2 hover:no-underline transition-colors disabled:opacity-50"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            Log out everywhere
          </button>
        </div>
      </div>
    </div>
  );
}
