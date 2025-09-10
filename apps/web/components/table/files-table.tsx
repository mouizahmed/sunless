"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";
import {
  ActionMenuItem,
  createSortableColumn,
  createDateColumn,
  createSelectColumn,
  createIconColumn,
  createCustomColumn,
  createNumericColumn,
  createActionsColumn,
} from "@/components/ui/table-columns";
import { DataTable, DataTableRef } from "@/components/ui/data-table";
import { FileItem } from "@/types/folder";
import { 
  FileVideo,
  FileAudio,
  FileText,
  Folder,
} from "lucide-react";
import { TagEditor, TagDisplay } from "@/components/ui/tag-editor";

const getFileIcon = (type: string) => {
  switch (type) {
    case "folder":
      return <Folder className="w-4 h-4 text-blue-500" />;
    case "video":
      return <FileVideo className="w-4 h-4 text-green-500" />;
    case "audio":
      return <FileAudio className="w-4 h-4 text-purple-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};


interface FilesTableProps {
  data: FileItem[];
  onSelectionChange?: (selectedFiles: FileItem[]) => void;
  onFolderClick?: (folderId: string) => void;
  onFolderRename?: (folderId: string, currentName: string) => void;
  onFolderDelete?: (folderId: string, folderName: string) => void;
  onFolderMove?: (folderId: string, folderName: string) => void;
  onTagsChange?: (itemId: string, tags: string[]) => void;
}

export interface FilesTableRef {
  clearSelection: () => void;
}

export const FilesTable = React.forwardRef<FilesTableRef, FilesTableProps>(function FilesTable({ 
  data, 
  onSelectionChange, 
  onFolderClick, 
  onFolderRename, 
  onFolderDelete,
  onFolderMove,
  onTagsChange 
}, ref) {
  const dataTableRef = React.useRef<DataTableRef>(null);
  
  const columns: ColumnDef<FileItem>[] = [
    createSelectColumn<FileItem>(),
    createIconColumn<FileItem>(
      "Name",
      (item) => ({
        icon: getFileIcon(item.type),
        text: item.name,
        onClick: item.type === "folder" && onFolderClick ? () => onFolderClick(item.id) : undefined,
      })
    ),
    createNumericColumn<FileItem>(
      "length",
      "Length",
      {
        placeholder: "—",
        className: "text-muted-foreground",
      }
    ),
    // Size column for files
    createCustomColumn<FileItem>(
      "size",
      () => <span>Size</span>,
      (item) => {
        if (item.type === "folder" || !item.size) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        // Format file size
        const formatFileSize = (bytes: number) => {
          const units = ['B', 'KB', 'MB', 'GB', 'TB'];
          let size = bytes;
          let unitIndex = 0;
          
          while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
          }
          
          return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
        };
        
        return <span className="text-muted-foreground">{formatFileSize(item.size)}</span>;
      },
      { enableSorting: true, accessorKey: "size" }
    ),
    createCustomColumn<FileItem>(
      "language",
      () => <span>Language</span>,
      (item) => {
        if (!item.language) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        // Handle both single language (string) and multiple languages (array)
        const languages = Array.isArray(item.language) ? item.language : [item.language];
        
        if (languages.length === 1) {
          return <span className="text-muted-foreground">{languages[0]}</span>;
        }
        
        // For multiple languages, show first 2 + count if more
        const displayLanguages = languages.slice(0, 2);
        const remainingCount = languages.length - 2;
        
        return (
          <div className="flex flex-wrap gap-1">
            {displayLanguages.map((lang, index) => (
              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border-blue-200">
                {lang}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border-gray-200">
                +{remainingCount}
              </span>
            )}
          </div>
        );
      },
      { enableSorting: true, accessorKey: "language" }
    ),
    createCustomColumn<FileItem>(
      "tags",
      () => (
        <div className="flex items-center space-x-1">
          <span>Tags</span>
          <Filter className="w-3 h-3" />
        </div>
      ),
      (item, value) => {
        const tags = (value as import("@/types/folder").Tag[]) || [];
        
        return (
          <div className="flex items-center space-x-2">
            {tags.length > 0 && (
              <TagDisplay tags={tags} maxVisible={2} />
            )}
            <TagEditor
              tags={tags}
              onTagsChange={(newTags) => onTagsChange?.(item.id, newTags)}
              maxTags={5}
              placeholder="Add tag..."
            />
          </div>
        );
      },
      {
        accessorKey: "tags",
        enableSorting: false,
      }
    ),
    createDateColumn<FileItem>("created_at", "Created"),
    createActionsColumn<FileItem>(
      (item) => {
        const isFolder = item.type === "folder";
        
        return isFolder ? [
          {
            label: "Open",
            onClick: () => onFolderClick && onFolderClick(item.id),
          },
          {
            label: "Rename",
            onClick: () => onFolderRename && onFolderRename(item.id, item.name),
          },
          {
            label: "Move",
            onClick: () => onFolderMove && onFolderMove(item.id, item.name),
          },
          {
            label: "Delete",
            onClick: () => onFolderDelete && onFolderDelete(item.id, item.name),
            className: "text-red-600",
          },
        ] : [
          {
            label: "View Transcript",
            onClick: () => {
              // TODO: Implement transcript view
              console.log('View transcript for:', item.name);
            },
          },
          {
            label: "Download",
            onClick: () => {
              // TODO: Implement file download
              console.log('Download file:', item.name);
            },
          },
          {
            label: "Export",
            onClick: () => {
              // TODO: Implement transcript export
              console.log('Export transcript for:', item.name);
            },
          },
          {
            label: "Move to Folder",
            onClick: () => {
              // TODO: Implement file move
              console.log('Move file:', item.name);
            },
          },
          {
            label: "Delete",
            onClick: () => {
              // TODO: Implement file deletion
              console.log('Delete file:', item.name);
            },
            className: "text-red-600",
          },
        ];
      },
      "w-40"
    ),
  ];
  
  React.useImperativeHandle(ref, () => ({
    clearSelection: () => dataTableRef.current?.clearSelection()
  }), []);
  
  return (
    <div className="w-full min-w-[800px]">
      <DataTable 
        ref={dataTableRef}
        columns={columns} 
        data={data} 
        onRowSelectionChange={onSelectionChange}
      />
    </div>
  );
});

export type { FileItem };
