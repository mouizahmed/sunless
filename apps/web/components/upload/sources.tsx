"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Upload } from "lucide-react";
import { UploadFile, UploadMedia } from "@/types/file";
import { useAuth } from "@clerk/nextjs";
import { uploadApi } from "@/lib/api";
import { FileDropzone } from "./file-dropzone";
import { MediaList } from "./media-list";

interface SourcesProps {
  setMediaList: (media: UploadMedia[]) => void;
  className?: string;
  uploadedMedia: UploadMedia[];
  handleMediaUpdate: (mediaId: string, updates: Partial<UploadMedia>) => void;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onCancelUpload: (mediaId: string) => Promise<void>;
  abortControllers: Map<string, AbortController>;
  setAbortControllers: React.Dispatch<React.SetStateAction<Map<string, AbortController>>>;
}

const CHUNK_SIZE = process.env.NEXT_PUBLIC_CHUNK_SIZE_MB
  ? parseInt(process.env.NEXT_PUBLIC_CHUNK_SIZE_MB) * 1024 * 1024
  : 100 * 1024 * 1024; // 100MB

export function Sources({
  setMediaList,
  className,
  uploadedMedia,
  handleMediaUpdate,
  onDeleteMedia,
  onCancelUpload,
  abortControllers,
  setAbortControllers,
}: SourcesProps) {
  const { getToken } = useAuth();

  const handleFilesAdded = (newFiles: UploadFile[]) => {
    console.log("handleFilesAdded called with newFiles:", newFiles);
    const updatedMedia = [...uploadedMedia, ...newFiles];
    setMediaList(updatedMedia);

    newFiles.forEach((file) => {
      startUpload(file);
    });
  };


  const startUpload = async (media: UploadMedia) => {
    const token = await getToken();
    if (!token) {
      handleMediaUpdate(media.id, {
        status: "failed",
        error: "Not authenticated",
      });
      throw new Error("Not authenticated");
    }

    const abortController = new AbortController();
    setAbortControllers((prev) => new Map(prev.set(media.id, abortController)));

    handleMediaUpdate(media.id, { status: "uploading" });

    try {
      if (media.type === "file") {
        const file = media as UploadFile;

        const initiateResponse = await uploadApi.initiateUpload(token, {
          file_name: file.name || file.file.name,
          file_size: file.size || file.file.size,
          content_type: file.contentType || file.file.type,
          duration: media.duration,
        });

        const { file_id, chunk_urls, total_chunks, storage_key } =
          initiateResponse;
        console.log("File ID:", file_id);

        handleMediaUpdate(media.id, {
          status: "uploading",
          progress: 1,
          fileId: file_id,
          totalChunks: total_chunks,
          uploadedChunks: 0,
        });

        await uploadToBucket(
          media,
          chunk_urls,
          token,
          file_id,
          storage_key,
          abortController.signal,
        );
      } else if (media.type === "url") {
        // TODO
      }
    } catch (error) {
      handleMediaUpdate(media.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error starting file upload:", (error as Error).message);
    }
  };

  const uploadToBucket = async (
    media: UploadMedia,
    chunkUrls: Array<{
      chunk_number: number;
      url: string;
      authorization_token: string;
    }>,
    token: string,
    fileId: string,
    storageKey: string,
    abortSignal?: AbortSignal,
  ) => {
    console.log("uploadToBucket called for file:", media.name);
    const file = media as UploadFile;
    const uploadedParts: { part_number: number; etag: string }[] = [];

    try {
      console.log("Chunk URLs:", chunkUrls);
      console.log(
        "File size:",
        file.size,
        "Chunk URLs count:",
        chunkUrls.length,
      );

      if (chunkUrls.length === 1) {
        // Single file upload
        console.log("Using single file upload");
        const uploadUrl = chunkUrls[0];

        handleMediaUpdate(media.id, { status: "uploading", progress: 25 });

        const fileId = await uploadApi.uploadFile(
          uploadUrl.url,
          uploadUrl.authorization_token,
          file.file,
          storageKey,
          file.contentType!, // TODO: FIX THIS
          abortSignal,
        );

        console.log("Single file upload completed, fileId:", fileId);

        uploadedParts.push({
          part_number: 1,
          etag: fileId,
        });

        handleMediaUpdate(media.id, {
          progress: 90,
          uploadedChunks: 1,
        });
      } else {
        // Multipart upload with chunks
        console.log("Using multipart upload, chunks:", chunkUrls.length);
        for (let i = 0; i < chunkUrls.length; i++) {
          const chunkUrl = chunkUrls[i];
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size!); // TODO: FIX THIS
          const chunk = file.file.slice(start, end);

          console.log(
            `Uploading chunk ${i + 1}/${chunkUrls.length}, size:`,
            chunk.size,
          );

          const sha1Hash = await uploadApi.uploadChunk(
            chunkUrl.url,
            chunkUrl.authorization_token,
            chunkUrl.chunk_number,
            chunk,
            storageKey,
            file.name!, // TODO: FIX THIS
            abortSignal,
          );

          console.log(`Chunk ${i + 1} uploaded, SHA1:`, sha1Hash);

          uploadedParts.push({
            part_number: chunkUrl.chunk_number,
            etag: sha1Hash,
          });

          const progress = ((i + 1) / chunkUrls.length) * 90; // Reserve 10% for completion
          handleMediaUpdate(media.id, {
            status: "uploading",
            progress: progress,
            uploadedChunks: i + 1,
          });
        }
      }

      console.log("Completing upload with parts:", uploadedParts);
      handleMediaUpdate(media.id, { progress: 95 });

      const freshToken = await getToken();
      if (!freshToken) {
        throw new Error(
          "Authentication token expired during upload completion",
        );
      }

      const completeResponse = await uploadApi.completeUpload(freshToken, {
        file_id: fileId,
        parts: uploadedParts,
      });

      const { file_id: completedFileId } = completeResponse;
      handleMediaUpdate(media.id, {
        status: "uploaded",
        progress: 100,
        fileId: completedFileId, // Backend file ID
      });

      setAbortControllers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(media.id);
        return newMap;
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Upload was cancelled by user");
        return;
      }

      handleMediaUpdate(media.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error uploading to Bucket:", (error as Error).message);

      setAbortControllers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(media.id);
        return newMap;
      });
    }
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Sources
            </CardTitle>
            <CardDescription>
              Upload your audio or video files here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <FileDropzone onFilesAdded={handleFilesAdded} />
            </div>
          </CardContent>
        </Card>
        <MediaList
          uploadedMedia={uploadedMedia}
          onCancelUpload={onCancelUpload}
          onDeleteMedia={onDeleteMedia}
        />
      </div>
    </div>
  );
}
