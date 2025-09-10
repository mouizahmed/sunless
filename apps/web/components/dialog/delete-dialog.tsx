"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteDialogProps<T = { name: string }> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  items: T[];
  onDelete: () => Promise<void>;
}

export function DeleteDialog<T extends { name: string }>({
  open,
  onOpenChange,
  title,
  description,
  items,
  onDelete,
}: DeleteDialogProps<T>) {
  const [isDeleting, setIsDeleting] = useState(false);
  const count = items.length;
  
  const defaultTitle = count === 1 
    ? `Delete ${items[0].name}`
    : `Delete ${count} Items`;
    
  const defaultDescription = count === 1
    ? `Are you sure you want to delete "${items[0].name}"? This action cannot be undone.`
    : `Are you sure you want to delete ${count} items? This action cannot be undone.`;

  const displayNames = items.slice(0, 3).map(item => item.name);
  const hasMore = items.length > 3;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-left">{title || defaultTitle}</DialogTitle>
              <DialogDescription className="text-left mt-1">
                {description || defaultDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-gray-50 p-3 rounded-md border max-h-40 overflow-y-auto">
            <div className="space-y-1">
              {displayNames.map((name, index) => (
                <p key={index} className="text-sm text-gray-900 font-medium">
                  • {name}
                </p>
              ))}
              {hasMore && (
                <p className="text-sm text-gray-500 font-medium">
                  • and {items.length - 3} more...
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              count === 1 ? "Delete" : `Delete ${count} Items`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}