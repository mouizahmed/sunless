import { Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";

interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

interface SharingControlsProps {
  collaborators: Collaborator[];
  onManageAccess?: () => void;
  onShare?: () => void;
  onCopyLink?: () => void;
  maxVisible?: number;
}

export function SharingControls({
  collaborators,
  onManageAccess,
  onShare,
  onCopyLink,
  maxVisible = 3,
}: SharingControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Collaborator avatars */}
      {collaborators.length > 0 && (
        <Button
          variant="ghost"
          className="h-8 p-0 hover:opacity-80"
          onClick={onManageAccess}
          title="View collaborators"
        >
          <div className="flex -space-x-2">
            {collaborators.slice(0, maxVisible).map((collaborator) => (
              <div
                key={collaborator.id}
                title={`${collaborator.name}${collaborator.email ? ` (${collaborator.email})` : ""}`}
              >
                <UserAvatar
                  name={collaborator.name}
                  avatarUrl={collaborator.avatar_url}
                  size="md"
                />
              </div>
            ))}
            {collaborators.length > maxVisible && (
              <div className="w-8 h-8 rounded-full bg-neutral-400 dark:bg-neutral-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-neutral-800">
                +{collaborators.length - maxVisible}
              </div>
            )}
          </div>
        </Button>
      )}

      {/* Share and Link buttons */}
      <div className="flex">
        <Button
          className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0 rounded-r-none"
          onClick={onShare}
        >
          Share
        </Button>
        <Button
          className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-700 text-white border-0 rounded-l-none border-l border-l-violet-700"
          onClick={onCopyLink}
        >
          <Link className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
