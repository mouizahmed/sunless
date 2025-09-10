"use client";

import React from "react";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "../ui/shadcn-io/dropzone";
import { UploadFile } from "@/types/file";
const MAX_FILE_SIZE = process.env.NEXT_PUBLIC_MAX_FILE_SIZE ? parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE) : 2 * 1024 * 1024 * 1024;

const calculateMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      resolve(0);
      return;
    }

    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    media.preload = 'metadata';
    
    media.onloadedmetadata = () => {
      URL.revokeObjectURL(media.src); // Clean up
      resolve(media.duration || 0);
    };
    
    media.onerror = () => {
      URL.revokeObjectURL(media.src); // Clean up
      resolve(0); // Return 0 instead of rejecting
    };
    
    media.src = URL.createObjectURL(file);
  });
};

interface FileDropzoneProps {
  onFilesAdded: (files: UploadFile[]) => void;
  className?: string;
}

export function FileDropzone({ onFilesAdded, className }: FileDropzoneProps) {

  const handleDrop = async (files: File[]) => {
    const newFiles = await Promise.all(files.map(async (file) => {
      const tooLarge = file.size > MAX_FILE_SIZE;

      // Calculate duration for media files
      let duration: number | undefined;
      if (!tooLarge && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
        try {
          duration = await calculateMediaDuration(file);
        } catch (error) {
          console.warn('Failed to calculate duration for', file.name, error);
          duration = undefined;
        }
      }

      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        status: tooLarge ? 'failed' : 'queued',
        progress: 0,
        error: tooLarge ? 'File size exceeds 2GB limit' : undefined,
        type: 'file',
        contentType: file.type,
        duration: duration,
      } as UploadFile;
    }));

    onFilesAdded(newFiles);
  };

  return (
    <div className={className}>
      <Dropzone
        onDrop={handleDrop}
        className="w-full"
        maxFiles={undefined} // Allow unlimited files
        multiple={true}
        accept={{
          'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
          'audio/*': ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac']
        }}
      >
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  );
}
