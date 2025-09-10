"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderTreeSelector } from "@/components/ui/folder-tree-selector";
import { FolderDialog } from "@/components/dialog/create-folder-dialog";
import { folderApi } from "@/lib/api";
import { Folder } from "@/types/folder";
import { FolderIcon, Plus, FolderOpen } from "lucide-react";

interface FolderSelectorProps {
  selectedFolder: Folder | null;
  onFolderChange: (folder: Folder | null) => void;
  title?: string;
  description?: string;
  className?: string;
}

export function FolderSelector({
  selectedFolder,
  onFolderChange,
  title = "Destination Folder",
  description = "Choose where to save your items",
  className
}: FolderSelectorProps) {
  const { getToken } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);

  // Load folders on component mount
  useEffect(() => {
    const loadFolders = async () => {
      setFoldersLoading(true);
      try {
        const token = await getToken();
        if (token) {
          const response = await folderApi.getAllFolders(token);
          setFolders(response.folders || []);
        }
      } catch (error) {
        console.error('Failed to load folders:', error);
      } finally {
        setFoldersLoading(false);
      }
    };
    
    loadFolders();
  }, [getToken]);

  const handleFolderSelect = (folderId: string | null) => {
    const folder = folders.find(f => f.id === folderId) || null;
    onFolderChange(folder);
    setShowFolderSelector(false);
  };
  
  const handleFolderCreated = (newFolder: Folder) => {
    setFolders(prev => [...prev, newFolder]);
    onFolderChange(newFolder);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{selectedFolder?.name || "All Files"}</span>
              </div>
            </div>
            <Dialog open={showFolderSelector} onOpenChange={setShowFolderSelector}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Change
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Destination Folder</DialogTitle>
                  <DialogDescription>
                    Choose which folder to save your items in
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {foldersLoading ? (
                    <div className="space-y-2 py-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2 p-2">
                          <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 bg-muted rounded flex-1 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <FolderTreeSelector
                      folders={folders}
                      selectedFolderId={selectedFolder?.id || null}
                      onSelectFolder={handleFolderSelect}
                    />
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateFolder(true)}
                    className="mr-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                  <Button variant="outline" onClick={() => setShowFolderSelector(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      
      {/* Create Folder Dialog */}
      <FolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        parentFolderId={selectedFolder?.id || null}
        parentFolderName={selectedFolder?.name || "All Files"}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
}