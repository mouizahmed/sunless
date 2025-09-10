"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Move, Loader2, AlertTriangle } from "lucide-react";
import { folderApi } from "@/lib/api";
import { FolderTreeSelector } from "@/components/ui/folder-tree-selector";
import { toast } from "sonner";
import { FileItem, Folder } from "@/types/folder";

interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFolders: FileItem[];
  onFoldersMovedCompleted: (movedFolders: { folderId: string; oldParentId: string | null; newParentId: string | null; updatedFolder: Folder }[]) => void;
}

export function MoveFolderDialog({
  open,
  onOpenChange,
  selectedFolders,
  onFoldersMovedCompleted,
}: MoveFolderDialogProps) {
  const { getToken } = useAuth();
  const [isMoving, setIsMoving] = useState(false);
  const [moveErrors, setMoveErrors] = useState<string[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

  // Only work with folders
  const folders = selectedFolders.filter(item => item.type === 'folder');

  // Get disabled folder IDs (can't move folder into itself or its descendants)
  const getDisabledFolderIds = () => {
    const disabledIds = new Set<string>();
    
    // Add all selected folders as disabled
    folders.forEach(folder => {
      disabledIds.add(folder.id);
    });

    // For each selected folder, find and disable all its descendants
    const findDescendants = (parentId: string) => {
      allFolders.forEach(folder => {
        if (folder.parent_id === parentId) {
          disabledIds.add(folder.id);
          findDescendants(folder.id);
        }
      });
    };

    folders.forEach(folder => {
      findDescendants(folder.id);
    });

    return Array.from(disabledIds);
  };

  // Load all folders when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingFolders(true);
      setMoveErrors([]);
      setSelectedDestinationId(null);
      
      const loadFolders = async () => {
        try {
          const token = await getToken();
          if (!token) throw new Error('Authentication required');

          const result = await folderApi.getAllFolders(token);
          setAllFolders(result.folders);
        } catch (error) {
          console.error('Failed to load folders:', error);
          setMoveErrors(['Failed to load folders. Please try again.']);
        } finally {
          setLoadingFolders(false);
        }
      };

      loadFolders();
    }
  }, [open, getToken]);

  const getDestinationName = () => {
    if (selectedDestinationId === null) {
      return "All Files (Root)";
    }
    const folder = allFolders.find(f => f.id === selectedDestinationId);
    return folder ? folder.name : "Unknown";
  };

  const handleMove = async () => {
    setIsMoving(true);
    setMoveErrors([]);
    
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const movedFolders: { folderId: string; oldParentId: string | null; newParentId: string | null; updatedFolder: Folder }[] = [];
      const errors: string[] = [];

      // Move each folder
      for (const folder of folders) {
        try {
          const updatedFolder = await folderApi.moveFolder(token, folder.id, selectedDestinationId);
          movedFolders.push({ 
            folderId: folder.id, 
            oldParentId: folder.folder_id || null, 
            newParentId: selectedDestinationId,
            updatedFolder
          });
        } catch (error) {
          console.error(`Failed to move folder ${folder.name}:`, error);
          errors.push(`Failed to move folder "${folder.name}"`);
        }
      }

      setMoveErrors(errors);

      if (movedFolders.length > 0) {
        onFoldersMovedCompleted(movedFolders);
        const movedCount = movedFolders.length;
        if (movedCount === 1) {
          toast.success('1 folder moved successfully');
        } else {
          toast.success(`${movedCount} folders moved successfully`);
        }
      }

      // Show error toast if there were errors
      if (errors.length > 0) {
        const errorCount = errors.length;
        if (errorCount === 1) {
          toast.error('1 folder failed to move');
        } else {
          toast.error(`${errorCount} folders failed to move`);
        }
      }

      // Close dialog if all folders were moved successfully
      if (errors.length === 0) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Move operation failed:', error);
      setMoveErrors(['Failed to move folders. Please try again.']);
      toast.error('Failed to move folders. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  const folderCount = folders.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Move className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-left">
                Move {folderCount} Folder{folderCount !== 1 ? 's' : ''}
              </DialogTitle>
              <DialogDescription className="text-left mt-1">
                Select the destination folder where you want to move the selected folders.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          {/* Selected folders preview */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Moving {folderCount} folder{folderCount !== 1 ? 's' : ''}:</h4>
            <div className="bg-gray-50 p-3 rounded-md border max-h-20 overflow-y-auto">
              <div className="space-y-1">
                {folders.map((folder) => (
                  <div key={folder.id} className="text-sm text-gray-900">• {folder.name}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Destination selector */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Select destination:</h4>
            {loadingFolders ? (
              <div className="flex items-center justify-center py-8 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading folders...</span>
              </div>
            ) : (
              <FolderTreeSelector
                folders={allFolders}
                selectedFolderId={selectedDestinationId}
                onSelectFolder={setSelectedDestinationId}
                disabledFolderIds={getDisabledFolderIds()}
              />
            )}
          </div>

          {/* Current selection */}
          {selectedDestinationId !== undefined && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm">
                <span className="font-medium">Moving to:</span> {getDestinationName()}
              </div>
            </div>
          )}
          
          {/* Errors */}
          {moveErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-2">Some folders could not be moved:</h4>
                  <ul className="text-xs text-red-700 space-y-1">
                    {moveErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            {moveErrors.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving || loadingFolders || selectedDestinationId === undefined}
          >
            {isMoving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              `Move to ${getDestinationName()}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}