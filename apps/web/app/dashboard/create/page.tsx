"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { FolderSelector } from "@/components/upload/folder-selector";
import { GlossarySelector } from "@/components/upload/glossary-selector";
import { Sources } from "@/components/upload/sources";
import { TranscriptionSettings } from "@/components/upload/transcription-settings";
import {
  BatchCreateTranscriptionsRequest,
  TranscriptionConfig,
} from "@/types/transcription";
import { ChevronLeft, Play } from "lucide-react";
import Link from "next/link";
import { UploadMedia, UploadFile } from "@/types/file";
import { transcriptionApi, uploadApi } from "@/lib/api";
import { toast } from "sonner";
import { Folder } from "@/types/folder";
import { Glossary } from "@/types/glossary";

export default function CreateTranscript() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [uploadedMedia, setUploadedMedia] = useState<UploadMedia[]>([]);

  const [transcriptionSettings, setTranscriptionSettings] =
    useState<TranscriptionConfig>({
      model: "nova-3",
      language: "auto",
      speakerDetection: false,
      fillerDetection: false,
    });

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(
    null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [abortControllers, setAbortControllers] = useState<Map<string, AbortController>>(new Map());

  if (isLoaded && !isSignedIn) {
    router.push("/login");
    return null;
  }

  const isMediaReady = () => {
    return (
      uploadedMedia.length > 0 &&
      uploadedMedia.every((media) => media.status === "uploaded")
    );
  };

  const handleMediaUpdate = (
    mediaId: string,
    updates: Partial<UploadMedia>,
  ) => {
    setUploadedMedia((currentMedia) =>
      currentMedia.map((m) =>
        m.id === mediaId ? ({ ...m, ...updates } as UploadMedia) : m,
      ),
    );
  };

  const handleDeleteMedia = async (mediaId: string) => {
    const media = uploadedMedia.find((m) => m.id === mediaId);
    if (!media) return;

    if (media.status === "failed") {
      setUploadedMedia((currentMedia) =>
        currentMedia.filter((m) => m.id !== mediaId)
      );
      toast.success("Failed media removed from list");
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      if (media.type === "file") {
        const file = media as UploadFile;
        if (file.fileId) {
          await uploadApi.deleteUpload(token, file.fileId);
        }
      } else if (media.type === "url") {
        // TODO: Handle URL deletion
      }

      setUploadedMedia((currentMedia) =>
        currentMedia.filter((m) => m.id !== mediaId)
      );

      toast.success("Media deleted successfully");
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelUpload = async (mediaId: string) => {
    const media = uploadedMedia.find((m) => m.id === mediaId);
    if (!media) return;

    if (media.type === "file") {
      const controller = abortControllers.get(mediaId);
      if (controller) {
        controller.abort();
        setAbortControllers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(mediaId);
          return newMap;
        });

        // Remove from upload list immediately
        setUploadedMedia((currentMedia) =>
          currentMedia.filter((m) => m.id !== mediaId)
        );

        // Update database status
        const file = media as UploadFile;
        if (file.fileId) {
          try {
            const token = await getToken();
            if (token) {
              await uploadApi.cancelUpload(token, file.fileId);
              toast.success("Upload cancelled successfully");
            }
          } catch (error) {
            console.error("Failed to cancel upload in database:", error);
            toast.error("Upload cancelled locally, but failed to update server");
          }
        } else {
          toast.success("Upload cancelled");
        }
      }
    } else if (media.type === "url") {
      // TODO: Handle URL cancellation
    }
  };

  const handleStartTranscription = async () => {
    if (!isMediaReady()) {
      toast.error("Please wait for all files to finish uploading");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const fileIds: string[] = uploadedMedia
        .filter((media): media is UploadMedia & { fileId: string } => 
          Boolean(media.fileId) && media.status === "uploaded"
        )
        .map((media) => media.fileId);

      if (fileIds.length === 0) {
        toast.error("No valid files found for transcription");
        return;
      }

      const batchCreateRequest: BatchCreateTranscriptionsRequest = {
        file_ids: fileIds,
        folder_id: selectedFolder?.id || undefined,
        glossary_id: selectedGlossary?.id || undefined,
        language_code:
          transcriptionSettings.language === "auto"
            ? undefined
            : transcriptionSettings.language,
        model: transcriptionSettings.model,
        settings: {
          speaker_detection: transcriptionSettings.speakerDetection,
          filler_detection: transcriptionSettings.fillerDetection,
        },
      };

      const response = await transcriptionApi.batchCreate(
        token,
        batchCreateRequest,
      );

      if (response.success) {
        toast.success(
          `Started transcription for ${response.transcriptions.length} file(s)`,
        );

        router.push("/dashboard");
      } else {
        toast.error("Failed to start transcription");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to start transcription. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <SidebarTrigger className="shrink-0" />

          <div className="flex items-center gap-2 flex-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back to All Files</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-sm font-medium">Create Transcript</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-medium">Create Transcript</h1>
            <p className="text-muted-foreground mt-1">
              Upload audio/video files or add URLs to generate accurate
              transcriptions
            </p>
          </div>

          {/* Media Input Area */}
          <Sources
            setMediaList={setUploadedMedia}
            uploadedMedia={uploadedMedia}
            handleMediaUpdate={handleMediaUpdate}
            onDeleteMedia={handleDeleteMedia}
            onCancelUpload={handleCancelUpload}
            abortControllers={abortControllers}
            setAbortControllers={setAbortControllers}
          />

          {/* Folder Selection */}
          <FolderSelector
            selectedFolder={selectedFolder}
            onFolderChange={setSelectedFolder}
            title="Destination Folder"
            description="Choose where to save your transcripts"
          />

          {/* Glossary Selection */}
          <GlossarySelector
            selectedGlossary={selectedGlossary}
            onGlossaryChange={setSelectedGlossary}
            title="Glossary"
            description="Select a glossary to improve transcription accuracy for specific terms"
          />

          {/* Transcription Settings */}
          <TranscriptionSettings
            settings={transcriptionSettings}
            onSettingsChange={setTranscriptionSettings}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6">
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>

            <Button
              onClick={handleStartTranscription}
              disabled={!isMediaReady() || isSubmitting}
              className="min-w-[140px] cursor-pointer"
            >
              <>
                <Play className="w-4 h-4 mr-2" />
                {isSubmitting ? "Starting..." : "Start Transcription"}
              </>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
