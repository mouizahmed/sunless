import { useState, useEffect, useCallback } from 'react';
import { FolderData, FolderDataResponse, FileItem, Folder } from '@/types/folder';
import { useAuth } from '@clerk/nextjs';
import { folderApi } from '@/lib/api';

// Cache for folder data to avoid unnecessary refetches
const folderDataCache = new Map<string, FolderDataResponse>();

// Cache for folder tree data
let folderTreeCache: Folder[] | null = null;
let folderTreeUpdateListeners: (() => void)[] = [];

export function useFolderData(folderId: string | null): FolderData {
  const { getToken } = useAuth();
  
  const [data, setData] = useState<FolderData>({
    folder: null,
    breadcrumbs: [{ id: null, name: "All Files", href: "/dashboard" }],
    files: [],
    loading: true,
    error: null,
    refetch: async () => {},
    updateFolder: () => {},
    addFolder: () => {},
    deleteFolder: () => {},
    moveFolder: () => {},
  });

  const updateFolder = useCallback((updatedFolder: Folder) => {
    // Update cache first
    updateFolderInCache(updatedFolder);
    
    // Refresh data from cache to trigger re-render
    const cacheKey = folderId || 'root';
    const cachedData = folderDataCache.get(cacheKey);
    
    if (cachedData) {
      const combinedFiles = [
        ...cachedData.contents.folders.map(folder => ({
          ...folder,
          type: 'folder' as const,
          tags: folder.tags,
          folder_id: folder.parent_id || undefined,
        })),
        ...cachedData.contents.files.map(file => ({
          ...file,
        }))
      ];

      setData(prev => ({
        ...prev,
        folder: cachedData.folder,
        breadcrumbs: cachedData.breadcrumbs,
        files: combinedFiles,
      }));
    }
  }, [folderId]);

  const addFolder = useCallback((newFolder: Folder) => {
    // Add to cache first
    addFolderToCache(newFolder.parent_id, newFolder);
    
    // Refresh data from cache to trigger re-render (only if belongs to current view)
    const shouldUpdateCurrentView = (
      (!folderId && !newFolder.parent_id) || // Root folder when on dashboard
      (folderId && newFolder.parent_id === folderId) // Child folder when in a specific folder
    );

    if (shouldUpdateCurrentView) {
      const cacheKey = folderId || 'root';
      const cachedData = folderDataCache.get(cacheKey);
      
      if (cachedData) {
        const combinedFiles = [
          ...cachedData.contents.folders.map(folder => ({
            ...folder,
            type: 'folder' as const,
            tags: folder.tags,
            folder_id: folder.parent_id || undefined,
          })),
          ...cachedData.contents.files.map(file => ({
            ...file,
          }))
        ];

        setData(prev => ({
          ...prev,
          files: combinedFiles,
        }));
      }
    }
  }, [folderId]);

  const deleteFolder = useCallback((deletedFolderId: string) => {
    // Remove from cache first
    removeFolderFromCache(deletedFolderId, folderId);
    
    // Refresh data from cache to trigger re-render
    const cacheKey = folderId || 'root';
    const cachedData = folderDataCache.get(cacheKey);
    
    if (cachedData) {
      const combinedFiles = [
        ...cachedData.contents.folders.map(folder => ({
          ...folder,
          type: 'folder' as const,
          tags: folder.tags,
          folder_id: folder.parent_id || undefined,
        })),
        ...cachedData.contents.files.map(file => ({
          ...file,
        }))
      ];

      setData(prev => ({
        ...prev,
        files: combinedFiles,
      }));
    }
  }, [folderId]);

  const moveFolder = useCallback((movedFolderId: string, oldParentId: string | null, newParentId: string | null, updatedFolder: Folder) => {
    // Update cache first
    moveFolderInCache(movedFolderId, oldParentId, newParentId, updatedFolder);
    
    // Refresh data from cache to trigger re-render (for both old and new parent views)
    const shouldUpdateCurrentView = (
      (!folderId && (oldParentId === null || newParentId === null)) || // Root view affected
      (folderId && (oldParentId === folderId || newParentId === folderId)) // Current folder is old or new parent
    );

    if (shouldUpdateCurrentView) {
      const cacheKey = folderId || 'root';
      const cachedData = folderDataCache.get(cacheKey);
      
      if (cachedData) {
        const combinedFiles = [
          ...cachedData.contents.folders.map(folder => ({
            ...folder,
            type: 'folder' as const,
            tags: folder.tags,
            folder_id: folder.parent_id || undefined,
          })),
          ...cachedData.contents.files.map(file => ({
            ...file,
          }))
        ];

        setData(prev => ({
          ...prev,
          folder: cachedData.folder,
          breadcrumbs: cachedData.breadcrumbs,
          files: combinedFiles,
        }));
      }
    }
  }, [folderId]);

  const fetchFolderData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const cacheKey = folderId || 'root';
      
      // Check cache first
      if (folderDataCache.has(cacheKey)) {
        const cachedData = folderDataCache.get(cacheKey)!;
        const combinedFiles = [
          ...cachedData.contents.folders.map(folder => ({
            ...folder,
            type: 'folder' as const,
            tags: folder.tags,
            folder_id: folder.parent_id || undefined,
          })),
          ...cachedData.contents.files.map(file => ({
            ...file,
          }))
        ];

        setData({
          folder: cachedData.folder,
          breadcrumbs: cachedData.breadcrumbs,
          files: combinedFiles,
          loading: false,
          error: null,
          refetch: fetchFolderData,
          updateFolder,
          addFolder,
          deleteFolder,
          moveFolder,
        });
        return;
      }

      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Fetch from centralized API
      const result: FolderDataResponse = await folderApi.getFolderData(token, folderId || undefined);

      // Add placeholder files for testing (TODO: Remove when backend supports files)
      const placeholderFiles: FileItem[] = [
        {
          id: 'file-1',
          name: 'Meeting Recording.mp4',
          type: 'video',
          size: 1024000000, // 1GB
          length: '45:32',
          language: ['English', 'Spanish'], // Multilingual meeting
          service: 'OpenAI Whisper',
          tags: [
            { id: 'tag-1', name: 'Meeting', item_id: 'file-1', item_type: 'file', user_id: '', created_at: '', updated_at: '' },
            { id: 'tag-2', name: 'Work', item_id: 'file-1', item_type: 'file', user_id: '', created_at: '', updated_at: '' }
          ],
          created_at: '2024-01-15T10:30:00Z',
          folder_id: folderId || undefined,
        },
        {
          id: 'file-2',
          name: 'Interview.wav',
          type: 'audio',
          size: 256000000, // 256MB
          length: '1:23:45',
          language: 'English',
          service: 'Deepgram',
          tags: [
            { id: 'tag-3', name: 'Interview', item_id: 'file-2', item_type: 'file', user_id: '', created_at: '', updated_at: '' }
          ],
          created_at: '2024-01-20T14:15:00Z',
          folder_id: folderId || undefined,
        },
        {
          id: 'file-3',
          name: 'Lecture Notes.txt',
          type: 'text',
          size: 1024000, // 1MB
          language: ['Spanish', 'English', 'Portuguese'], // Multilingual content
          tags: [
            { id: 'tag-4', name: 'Education', item_id: 'file-3', item_type: 'file', user_id: '', created_at: '', updated_at: '' },
            { id: 'tag-5', name: 'Multilingual', item_id: 'file-3', item_type: 'file', user_id: '', created_at: '', updated_at: '' }
          ],
          created_at: '2024-02-01T09:00:00Z',
          folder_id: folderId || undefined,
        },
        {
          id: 'file-4',
          name: 'Podcast Episode 15.mp3',
          type: 'audio',
          size: 128000000, // 128MB
          length: '58:12',
          language: 'French',
          service: 'Azure Speech',
          tags: [
            { id: 'tag-6', name: 'Podcast', item_id: 'file-4', item_type: 'file', user_id: '', created_at: '', updated_at: '' }
          ],
          created_at: '2024-02-10T16:45:00Z',
          folder_id: folderId || undefined,
        },
        {
          id: 'file-5',
          name: 'Conference Call.webm',
          type: 'video',
          size: 512000000, // 512MB
          length: '2:15:30',
          language: ['German', 'English'], // Mixed language call
          service: 'Google Speech-to-Text',
          created_at: '2024-02-15T11:20:00Z',
          folder_id: folderId || undefined,
        },
        {
          id: 'file-6',
          name: 'International Webinar.mp4',
          type: 'video',
          size: 768000000, // 768MB
          length: '1:45:20',
          language: ['English', 'French', 'German', 'Spanish'], // Highly multilingual
          service: 'OpenAI Whisper',
          tags: [
            { id: 'tag-7', name: 'Webinar', item_id: 'file-6', item_type: 'file', user_id: '', created_at: '', updated_at: '' },
            { id: 'tag-8', name: 'International', item_id: 'file-6', item_type: 'file', user_id: '', created_at: '', updated_at: '' }
          ],
          created_at: '2024-02-20T13:30:00Z',
          folder_id: folderId || undefined,
        }
      ];

      // Add placeholder files to the result
      result.contents.files = [...result.contents.files, ...placeholderFiles];
      
      // Cache the result
      folderDataCache.set(cacheKey, result);
      
      // Combine folders and files for table display
      const combinedFiles: FileItem[] = [
        ...result.contents.folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          type: 'folder' as const,
          tags: folder.tags,
          created_at: folder.created_at,
          folder_id: folder.parent_id || undefined,
        })),
        ...result.contents.files.map(file => ({
          ...file,
        }))
      ];

      setData({
        folder: result.folder,
        breadcrumbs: result.breadcrumbs,
        files: combinedFiles,
        loading: false,
        error: null,
        refetch: fetchFolderData,
        updateFolder,
        addFolder,
        deleteFolder,
        moveFolder,
      });
    } catch (err) {
      console.error('Failed to fetch folder data:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load folder data'
      }));
    }
  }, [folderId, getToken, updateFolder, addFolder, deleteFolder, moveFolder]);

  // Refetch data when folderId changes
  useEffect(() => {
    fetchFolderData();
  }, [fetchFolderData]);

  return data;
}


// Helper function to add a new folder to existing cache
export function addFolderToCache(parentFolderId: string | null, newFolder: Folder) {
  const cacheKey = parentFolderId || 'root';
  const existingData = folderDataCache.get(cacheKey);
  
  if (existingData) {
    // Add the new folder to the existing folders list
    const updatedData = {
      ...existingData,
      contents: {
        ...existingData.contents,
        folders: [...existingData.contents.folders, newFolder].sort((a, b) => a.name.localeCompare(b.name))
      },
      stats: {
        ...existingData.stats,
        total_folders: existingData.stats.total_folders + 1
      }
    };
    folderDataCache.set(cacheKey, updatedData);
  }
  
  // Update folder tree cache
  addFolderToTreeCache(newFolder);
  
  return existingData ? true : false;
}

// Helper function to update a folder in existing cache
export function updateFolderInCache(updatedFolder: Folder) {
  // Update folder data cache
  for (const [cacheKey, cacheData] of folderDataCache.entries()) {
    let hasUpdates = false;
    
    // Update if this is the current folder
    if (cacheData.folder?.id === updatedFolder.id) {
      cacheData.folder = updatedFolder;
      hasUpdates = true;
    }
    
    // Update if folder exists in the folders list
    const folderIndex = cacheData.contents.folders.findIndex(f => f.id === updatedFolder.id);
    if (folderIndex !== -1) {
      cacheData.contents.folders[folderIndex] = updatedFolder;
      hasUpdates = true;
    }
    
    // Update breadcrumbs
    const originalBreadcrumbs = JSON.stringify(cacheData.breadcrumbs);
    cacheData.breadcrumbs = cacheData.breadcrumbs.map(breadcrumb => 
      breadcrumb.id === updatedFolder.id 
        ? { ...breadcrumb, name: updatedFolder.name }
        : breadcrumb
    );
    if (JSON.stringify(cacheData.breadcrumbs) !== originalBreadcrumbs) {
      hasUpdates = true;
    }
    
    if (hasUpdates) {
      folderDataCache.set(cacheKey, cacheData);
    }
  }
  
  // Update folder tree cache
  updateFolderInTreeCache(updatedFolder);
}

// Helper function to remove a folder from existing cache
export function removeFolderFromCache(folderId: string, parentFolderId: string | null) {
  // Remove the folder from its parent's cache
  const parentCacheKey = parentFolderId || 'root';
  const parentData = folderDataCache.get(parentCacheKey);
  
  if (parentData) {
    const updatedData = {
      ...parentData,
      contents: {
        ...parentData.contents,
        folders: parentData.contents.folders.filter(f => f.id !== folderId)
      },
      stats: {
        ...parentData.stats,
        total_folders: parentData.stats.total_folders - 1
      }
    };
    folderDataCache.set(parentCacheKey, updatedData);
  }
  
  // Remove the folder's own cache entry
  folderDataCache.delete(folderId);
  
  // Remove from any other cache entries where it might appear in breadcrumbs
  for (const [cacheKey, cacheData] of folderDataCache.entries()) {
    const originalBreadcrumbs = JSON.stringify(cacheData.breadcrumbs);
    cacheData.breadcrumbs = cacheData.breadcrumbs.filter(breadcrumb => breadcrumb.id !== folderId);
    
    if (JSON.stringify(cacheData.breadcrumbs) !== originalBreadcrumbs) {
      folderDataCache.set(cacheKey, cacheData);
    }
  }
  
  // Update folder tree cache
  removeFolderFromTreeCache(folderId);
}

// Helper function to move a folder in existing cache
export function moveFolderInCache(folderId: string, oldParentId: string | null, newParentId: string | null, updatedFolder: Folder) {
  // First remove the folder from its old location
  const oldParentCacheKey = oldParentId || 'root';
  const oldParentData = folderDataCache.get(oldParentCacheKey);
  
  if (oldParentData) {
    const updatedOldParentData = {
      ...oldParentData,
      contents: {
        ...oldParentData.contents,
        folders: oldParentData.contents.folders.filter(f => f.id !== folderId)
      },
      stats: {
        ...oldParentData.stats,
        total_folders: oldParentData.stats.total_folders - 1
      }
    };
    folderDataCache.set(oldParentCacheKey, updatedOldParentData);
  }
  
  // Then add the folder to its new location
  const newParentCacheKey = newParentId || 'root';
  const newParentData = folderDataCache.get(newParentCacheKey);
  
  if (newParentData) {
    const updatedNewParentData = {
      ...newParentData,
      contents: {
        ...newParentData.contents,
        folders: [...newParentData.contents.folders, updatedFolder].sort((a, b) => a.name.localeCompare(b.name))
      },
      stats: {
        ...newParentData.stats,
        total_folders: newParentData.stats.total_folders + 1
      }
    };
    folderDataCache.set(newParentCacheKey, updatedNewParentData);
  }
  
  // Update the folder in any other cache entries (like breadcrumbs)
  updateFolderInCache(updatedFolder);
  
  // Update folder tree cache
  updateFolderInTreeCache(updatedFolder);
}


// Folder tree cache management
export function getFolderTreeCache(): Folder[] | null {
  return folderTreeCache;
}

export function setFolderTreeCache(folders: Folder[]) {
  folderTreeCache = folders;
  // Notify all listeners that tree cache has changed
  folderTreeUpdateListeners.forEach(listener => listener());
}

export function clearFolderTreeCache() {
  folderTreeCache = null;
}

export function updateFolderInTreeCache(updatedFolder: Folder) {
  if (folderTreeCache) {
    const folderIndex = folderTreeCache.findIndex(f => f.id === updatedFolder.id);
    if (folderIndex !== -1) {
      folderTreeCache[folderIndex] = updatedFolder;
      // Notify listeners of cache change
      folderTreeUpdateListeners.forEach(listener => listener());
    }
  }
}

export function addFolderToTreeCache(newFolder: Folder) {
  if (folderTreeCache) {
    folderTreeCache.push(newFolder);
    // Notify listeners of cache change
    folderTreeUpdateListeners.forEach(listener => listener());
  }
}

export function removeFolderFromTreeCache(folderId: string) {
  if (folderTreeCache) {
    // Helper function to recursively find all child folder IDs
    const findAllChildIds = (parentId: string, allFolders: Folder[]): string[] => {
      const childIds: string[] = [];
      const children = allFolders.filter(f => f.parent_id === parentId);
      
      children.forEach(child => {
        childIds.push(child.id);
        // Recursively find grandchildren
        childIds.push(...findAllChildIds(child.id, allFolders));
      });
      
      return childIds;
    };

    // Find all descendant folder IDs (including the folder itself)
    const allFolderIdsToRemove = [folderId, ...findAllChildIds(folderId, folderTreeCache)];
    
    // Remove the folder and all its descendants
    folderTreeCache = folderTreeCache.filter(f => !allFolderIdsToRemove.includes(f.id));
    
    // Notify listeners of cache change
    folderTreeUpdateListeners.forEach(listener => listener());
  }
}

// Subscribe to folder tree cache changes
export function subscribeFolderTreeUpdates(listener: () => void) {
  folderTreeUpdateListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    folderTreeUpdateListeners = folderTreeUpdateListeners.filter(l => l !== listener);
  };
}