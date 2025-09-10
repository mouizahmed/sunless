"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { BulkActions, commonBulkActions } from "@/components/ui/bulk-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Plus, 
  FolderPlus, 
  Upload,
  ChevronDown,
  FileAudio,
  Home,
} from "lucide-react";
import { FilesTable, FilesTableRef, type FileItem } from "@/components/table/files-table";
import type { Folder } from "@/types/folder";
import { FolderDialog } from "@/components/dialog/create-folder-dialog";
import { RenameFolderDialog } from "@/components/dialog/rename-folder-dialog";
import { DeleteDialog } from "@/components/dialog/delete-dialog";
import { MoveFolderDialog } from "@/components/dialog/move-folder-dialog";
import { useFolderData } from "@/hooks/use-folder-data";
import { folderApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardLayoutProps {
  currentFolderId?: string | null;
  showBreadcrumbs?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  parentFolderName?: string;
}

export function DashboardLayout({
  currentFolderId,
  showBreadcrumbs = false,
  emptyStateTitle = "No files yet",
  emptyStateDescription = "Get started by uploading your first file for transcription",
  parentFolderName = "All Files"
}: DashboardLayoutProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const { folder, breadcrumbs, files, loading, error, refetch, updateFolder, addFolder, deleteFolder, moveFolder } = useFolderData(currentFolderId ?? null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [isRenameChildFolderOpen, setIsRenameChildFolderOpen] = useState(false);
  const [selectedFolderForRename, setSelectedFolderForRename] = useState<{id: string, name: string} | null>(null);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [selectedFolderForDelete, setSelectedFolderForDelete] = useState<{id: string, name: string} | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedItemsForDelete, setSelectedItemsForDelete] = useState<FileItem[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedItemsForMove, setSelectedItemsForMove] = useState<FileItem[]>([]);
  const filesTableRef = useRef<FilesTableRef>(null);

  const handleFileSelection = useCallback((selectedFiles: FileItem[]) => {
    setSelectedFiles(selectedFiles.map(file => file.id));
    setSelectedItemsForDelete(selectedFiles);
    setSelectedItemsForMove(selectedFiles);
  }, []);

  const handleClearSelection = useCallback(() => {
    filesTableRef.current?.clearSelection();
    setSelectedItemsForDelete([]);
    setSelectedItemsForMove([]);
  }, []);

  const handleFolderClick = useCallback((folderId: string) => {
    router.push(`/dashboard/folder/${folderId}`);
  }, [router]);

  const handleFolderRename = useCallback((folderId: string, currentName: string) => {
    setSelectedFolderForRename({ id: folderId, name: currentName });
    if (showBreadcrumbs) {
      setIsRenameChildFolderOpen(true);
    } else {
      setIsRenameFolderOpen(true);
    }
  }, [showBreadcrumbs]);

  const handleFolderDelete = useCallback((folderId: string, folderName: string) => {
    setSelectedFolderForDelete({ id: folderId, name: folderName });
    setIsDeleteFolderOpen(true);
  }, []);

  const handleSingleFolderMove = useCallback((folderId: string, folderName: string) => {
    const folderItem: FileItem = {
      id: folderId,
      name: folderName,
      type: 'folder',
      created_at: new Date().toISOString(),
      folder_id: currentFolderId || undefined,
    };
    setSelectedItemsForMove([folderItem]);
    setIsMoveDialogOpen(true);
  }, [currentFolderId]);

  const handleBulkDelete = useCallback(() => {
    if (selectedItemsForDelete.length > 0) {
      setIsBulkDeleteOpen(true);
    }
  }, [selectedItemsForDelete]);

  const performBulkDelete = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('Authentication required');

    const errors: string[] = [];
    const successfulDeletes: string[] = [];

    // Delete folders (only folders are supported for now)
    for (const item of selectedItemsForDelete) {
      if (item.type === 'folder') {
        try {
          await folderApi.deleteFolder(token, item.id);
          successfulDeletes.push(item.id);
          deleteFolder(item.id);
        } catch (error) {
          console.error(`Failed to delete folder ${item.name}:`, error);
          errors.push(item.name);
        }
      } else {
        errors.push(`${item.name} (files not supported)`);
      }
    }

    // Clear selections
    filesTableRef.current?.clearSelection();
    setSelectedItemsForDelete([]);
    setSelectedFiles([]);

    // Show appropriate toast messages
    if (successfulDeletes.length > 0) {
      toast.success(`${successfulDeletes.length} item${successfulDeletes.length !== 1 ? 's' : ''} deleted successfully`);
    }
    
    if (errors.length > 0) {
      toast.error(`Failed to delete: ${errors.join(', ')}`);
    }
  }, [selectedItemsForDelete, deleteFolder, getToken]);

  const handleBulkMove = useCallback(() => {
    // Only show move dialog if all selected items are folders
    const folderItems = selectedItemsForMove.filter(item => item.type === 'folder');
    if (folderItems.length > 0 && folderItems.length === selectedItemsForMove.length) {
      setIsMoveDialogOpen(true);
    }
  }, [selectedItemsForMove]);

  // Handle tag changes with backend API call
  const handleTagsChange = useCallback(async (itemId: string, newTags: string[]) => {
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Find the item to determine if it's a folder or file
      const item = files.find(f => f.id === itemId);
      if (!item) {
        toast.error('Item not found');
        return;
      }

      if (item.type === 'folder') {
        // Update folder tags
        const response = await folderApi.updateFolderTags(token, itemId, newTags);
        
        // Create updated folder object with new tags
        const updatedFolder: import('@/types/folder').Folder = {
          id: item.id,
          name: item.name,
          parent_id: item.folder_id || null,
          user_id: '', // This will be set correctly by the context
          tags: response.tags,
          created_at: item.created_at,
          updated_at: new Date().toISOString(),
        };
        
        // Update the cache with the updated folder
        updateFolder(updatedFolder);
        
        toast.success('Folder tags updated successfully');
      } else {
        // TODO: Implement file tags when file endpoints are ready
        toast.error('File tag updates not implemented yet');
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error('Failed to update tags');
    }
  }, [files, getToken, updateFolder]);

  const handleMoveFoldersCompleted = useCallback((movedFolders: { folderId: string; oldParentId: string | null; newParentId: string | null; updatedFolder: Folder }[]) => {
    // Update cache for moved folders
    movedFolders.forEach(({ folderId, oldParentId, newParentId, updatedFolder }) => {
      moveFolder(folderId, oldParentId, newParentId, updatedFolder);
    });
    
    // Clear selection after successful move
    filesTableRef.current?.clearSelection();
    setSelectedItemsForMove([]);
    setSelectedFiles([]);
  }, [moveFolder]);

  // Check if all selected items are folders (for Move button)
  const allSelectedAreFolders = selectedItemsForMove.length > 0 && 
    selectedItemsForMove.every(item => item.type === 'folder');

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          loading={true}
          loadingLeftWidth="w-32"
          loadingRightWidths={["w-32", "w-24"]}
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <div className="h-full p-4 pb-20 relative">
              <div className="animate-pulse space-y-4">
                {/* Table header */}
                <div className="flex space-x-4 p-4 border-b">
                  <div className="h-4 bg-muted rounded w-4"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
                
                {/* Table rows */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex space-x-4 p-4 border-b">
                    <div className="h-4 bg-muted rounded w-4"></div>
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isLoaded && !isSignedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader
          loading={true}
          loadingLeftWidth="w-32"
          loadingRightWidths={["w-32", "w-24"]}
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <div className="h-full p-4 pb-20 relative">
              <div className="animate-pulse space-y-4">
                {/* Table header */}
                <div className="flex space-x-4 p-4 border-b">
                  <div className="h-4 bg-muted rounded w-4"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
                
                {/* Table rows */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex space-x-4 p-4 border-b">
                    <div className="h-4 bg-muted rounded w-4"></div>
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state for data (only for actual errors, not empty folders)
  if (error && !error.includes('no rows')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading: {error}</p>
          <button onClick={refetch} className="text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader
        leftContent={
          <>
            {showBreadcrumbs ? (
              <div className="flex items-center gap-2 min-w-0">
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.href}>
                    {index > 0 && <span className="text-muted-foreground">/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <button 
                        onClick={() => setIsRenameFolderOpen(true)}
                        className="text-sm font-medium truncate hover:underline cursor-pointer"
                        disabled={!folder}
                      >
                        {breadcrumb.name}
                      </button>
                    ) : (
                      <Link 
                        href={breadcrumb.href} 
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
                      >
                        {index === 0 && <Home className="w-4 h-4" />}
                        <span className={index === 0 ? "hidden sm:inline" : ""}>{breadcrumb.name}</span>
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground">{folder?.name || parentFolderName}</span>
              </div>
            )}
          </>
        }
        rightContent={
          <>
            {selectedFiles.length > 0 ? (
              <BulkActions
                selectedCount={selectedFiles.length}
                onClear={handleClearSelection}
                actions={[
                  commonBulkActions.export(() => {}), // TODO: Implement export
                  commonBulkActions.move(handleBulkMove, !allSelectedAreFolders),
                  commonBulkActions.delete(handleBulkDelete),
                ]}
              />
            ) : (
              <>
                {/* Search */}
                <div className="flex-1 min-w-0 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full text-sm"
                    />
                  </div>
                </div>
                
                {/* Create Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Create
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/create" className="flex items-center">
                        <FileAudio className="w-4 h-4 mr-2" />
                        New Transcript
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <button className="flex items-center w-full" onClick={() => setIsCreateFolderOpen(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        New Folder
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </>
        }
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {files.length > 0 ? (
          <div className="flex-1 overflow-x-auto" style={{ clipPath: 'none' }}>
            <div className="h-full p-4 pb-20 relative">
              <FilesTable 
                ref={filesTableRef}
                data={files} 
                onSelectionChange={handleFileSelection}
                onFolderClick={handleFolderClick}
                onFolderRename={handleFolderRename}
                onFolderDelete={handleFolderDelete}
                onFolderMove={handleSingleFolderMove}
                onTagsChange={handleTagsChange}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{emptyStateTitle}</h3>
              <p className="text-muted-foreground mb-4">
                {emptyStateDescription}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/create" className="flex items-center">
                      <FileAudio className="w-4 h-4 mr-2" />
                      New Transcript
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <button className="flex items-center w-full" onClick={() => setIsCreateFolderOpen(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      New Folder
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </main>
      
      {/* Folder Creation Dialog */}
      <FolderDialog 
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        parentFolderId={currentFolderId}
        parentFolderName={folder?.name || parentFolderName}
        onFolderCreated={addFolder}
      />
      
      {/* Folder Rename Dialog - Current Folder (Breadcrumb) */}
      {showBreadcrumbs && folder && (
        <RenameFolderDialog 
          open={isRenameFolderOpen}
          onOpenChange={setIsRenameFolderOpen}
          folderId={folder.id}
          currentName={folder.name}
          onFolderRenamed={updateFolder}
        />
      )}

      {/* Child Folder Rename Dialog - From Table Actions */}
      {selectedFolderForRename && (
        <RenameFolderDialog 
          open={showBreadcrumbs ? isRenameChildFolderOpen : isRenameFolderOpen}
          onOpenChange={showBreadcrumbs ? setIsRenameChildFolderOpen : setIsRenameFolderOpen}
          folderId={selectedFolderForRename.id}
          currentName={selectedFolderForRename.name}
          onFolderRenamed={updateFolder}
        />
      )}

      {/* Delete Folder Dialog */}
      {selectedFolderForDelete && (
        <DeleteDialog 
          open={isDeleteFolderOpen}
          onOpenChange={setIsDeleteFolderOpen}
          items={[{ name: selectedFolderForDelete.name }]}
          onDelete={async () => {
            const token = await getToken();
            if (!token) throw new Error('Authentication required');
            await folderApi.deleteFolder(token, selectedFolderForDelete.id);
            deleteFolder(selectedFolderForDelete.id);
            toast.success('Folder deleted successfully');
          }}
        />
      )}

      {/* Bulk Delete Dialog */}
      {selectedItemsForDelete.length > 0 && (
        <DeleteDialog
          open={isBulkDeleteOpen}
          onOpenChange={setIsBulkDeleteOpen}
          items={selectedItemsForDelete}
          onDelete={performBulkDelete}
        />
      )}

      {/* Move Folder Dialog */}
      <MoveFolderDialog 
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        selectedFolders={selectedItemsForMove}
        onFoldersMovedCompleted={handleMoveFoldersCompleted}
      />
    </div>
  );
}