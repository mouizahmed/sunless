"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, Folder, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Folder as FolderType } from "@/types/folder";

interface FolderTreeNode extends FolderType {
  children: FolderTreeNode[];
  level: number;
}

interface FolderTreeSelectorProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  disabledFolderIds?: string[];
  className?: string;
}

export function FolderTreeSelector({
  folders,
  selectedFolderId,
  onSelectFolder,
  disabledFolderIds = [],
  className,
}: FolderTreeSelectorProps) {
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  // Build tree structure from flat folder list
  const buildTree = React.useMemo(() => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Create nodes for all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        level: 0,
      });
    });

    // Build parent-child relationships
    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        } else {
          // Parent not found, treat as root
          rootFolders.push(node);
        }
      } else {
        rootFolders.push(node);
      }
    });

    // Sort children by name recursively
    const sortChildren = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };

    sortChildren(rootFolders);
    return rootFolders;
  }, [folders]);

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFolder = (folder: FolderTreeNode) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isDisabled = disabledFolderIds.includes(folder.id);
    const hasChildren = folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 rounded-md text-sm hover:bg-muted cursor-pointer",
            isSelected && "bg-blue-100 text-blue-900",
            isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
          )}
          style={{ paddingLeft: `${0.5 + folder.level * 1.5}rem` }}
          onClick={() => !isDisabled && onSelectFolder(folder.id)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled) {
                  toggleExpanded(folder.id);
                }
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}
          <Folder className="h-4 w-4 text-blue-500" />
          <span className="truncate">{folder.name}</span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("border rounded-md", className)}>
      <ScrollArea className="h-64">
        <div className="p-2">
          {/* Root level option */}
          <div
            className={cn(
              "flex items-center gap-2 py-1 px-2 rounded-md text-sm hover:bg-muted cursor-pointer",
              selectedFolderId === null && "bg-blue-100 text-blue-900"
            )}
            onClick={() => onSelectFolder(null)}
          >
            <Home className="h-4 w-4 text-gray-500" />
            <span>All Files (Root)</span>
          </div>
          
          {/* Folder tree */}
          <div className="mt-1">
            {buildTree.map(folder => renderFolder(folder))}
          </div>
          
          {folders.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No folders available
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}