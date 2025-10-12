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
import { Badge } from "@/components/ui/badge";
// Select components removed - not used in this component
import { X, UserPlus } from "lucide-react";
import { AccessSelector } from "@/components/ui/access-selector";
import { validateEmail } from "@/utils/validation";

interface InviteMembersDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  workspaceName?: string;
}

export function InviteMembersDialog({ isOpen, onClose, workspaceName }: InviteMembersDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailRole, setEmailRole] = useState("member");

  const addEmail = () => {
    const email = currentEmail.trim().toLowerCase();
    if (!email) return;

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (emails.includes(email)) {
      setError("This email is already added");
      return;
    }

    setEmails([...emails, email]);
    setCurrentEmail("");
    setError(null);
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emails.length === 0) {
      setError("Please add at least one email address");
      return;
    }

    try {
      setSending(true);
      setError(null);

      // TODO: Implement actual invite sending
      console.log("Sending invites to:", emails, "with role:", emailRole);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close dialog and reset form on success
      onClose?.();
      setEmails([]);
      setCurrentEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invites");
    } finally {
      setSending(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">
            Invite members to {workspaceName || "workspace"}
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            Invite people to collaborate in your workspace. They'll receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Invites Section */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email-input" className="text-neutral-900 dark:text-neutral-100">
                Email addresses
              </Label>
              <div className="flex gap-2">
                <Input
                  id="email-input"
                  type="email"
                  placeholder="Enter email address"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sending}
                  className="flex-1 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100"
                />
                <Button
                  type="button"
                  onClick={addEmail}
                  disabled={!currentEmail.trim() || sending}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Role Selection for Email Invites */}
            <div className="space-y-2">
              <Label htmlFor="email-role" className="text-sm text-neutral-700 dark:text-neutral-300">
                Role for email invites
              </Label>
              <AccessSelector
                value={emailRole}
                onChange={setEmailRole}
                type="workspace"
                disabled={sending}
              />
            </div>

            {/* Email Tags */}
            {emails.length > 0 && (
              <div className="space-y-2">
                <Label className="text-neutral-900 dark:text-neutral-100">
                  Inviting ({emails.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 px-2 py-1"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ml-2 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-full p-0.5"
                        disabled={sending}
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              onClick={handleSendInvites}
              disabled={sending || emails.length === 0}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              <UserPlus size={16} className="mr-2" />
              {sending ? "Sending invites..." : `Send ${emails.length} invite${emails.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}