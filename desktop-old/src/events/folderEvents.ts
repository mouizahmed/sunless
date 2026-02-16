// Folder-related custom events for cross-component communication
import { type FolderCreatedDetail } from "@/types/folder";

export type { FolderCreatedDetail };

export const FOLDER_EVENTS = {
  FOLDER_CREATED: "folder:created",
  FOLDERS_RELOAD: "folders:reload",
} as const;

// Helper functions for dispatching events
export function dispatchFolderCreated(folder: FolderCreatedDetail) {
  window.dispatchEvent(
    new CustomEvent(FOLDER_EVENTS.FOLDER_CREATED, {
      detail: folder,
    })
  );
}

export function dispatchFoldersReload() {
  window.dispatchEvent(new CustomEvent(FOLDER_EVENTS.FOLDERS_RELOAD));
}

// Helper functions for listening to events
export function onFolderCreated(
  handler: (folder: FolderCreatedDetail) => void
): () => void {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<FolderCreatedDetail>;
    handler(customEvent.detail);
  };

  window.addEventListener(FOLDER_EVENTS.FOLDER_CREATED, listener);

  // Return cleanup function
  return () => {
    window.removeEventListener(FOLDER_EVENTS.FOLDER_CREATED, listener);
  };
}

export function onFoldersReload(handler: () => void): () => void {
  window.addEventListener(FOLDER_EVENTS.FOLDERS_RELOAD, handler);

  // Return cleanup function
  return () => {
    window.removeEventListener(FOLDER_EVENTS.FOLDERS_RELOAD, handler);
  };
}
