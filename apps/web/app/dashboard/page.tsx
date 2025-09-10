"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useFolderContext } from "@/hooks/use-folder-context";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function Dashboard() {
  const { currentFolderId } = useFolderContext();

  return (
    <DashboardLayout 
      currentFolderId={currentFolderId}
      showBreadcrumbs={false}
      emptyStateTitle="No files yet"
      emptyStateDescription="Get started by uploading your first file for transcription"
      parentFolderName="All Files"
    />
  );
}