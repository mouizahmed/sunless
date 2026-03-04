import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FolderRecord } from '@/types/folder'
import type { NoteRecord } from '@/types/note'

type TreeFolder = {
  id: string
  name: string
  noteIds: string[]
}

export function NotesTree({
  folders,
  notes,
  isLoading,
  error,
  folderPagination,
  onLoadMore,
  selectedFolderId,
  selectedNoteId,
  search,
  onSelectFolder,
  onSelectNote,
  onCreateFolder,
  onCreateNote,
}: {
  folders: FolderRecord[]
  notes: NoteRecord[]
  isLoading: boolean
  error: string | null
  folderPagination: Record<string, { hasMore: boolean; isLoading: boolean }>
  onLoadMore: (folderId: string | null) => void
  selectedFolderId: string | null
  selectedNoteId: string | null
  search: string
  onSelectFolder: (id: string | null) => void
  onSelectNote: (noteId: string) => void
  onCreateFolder: () => void
  onCreateNote: () => void
}) {
  const [treeExpanded, setTreeExpanded] = useState(true)
  const [folderExpansions, setFolderExpansions] = useState<Record<string, boolean>>({})

  const notesById = useMemo(() => {
    const map = new Map<string, NoteRecord>()
    for (const n of notes) map.set(n.id, n)
    return map
  }, [notes])

  const treeFolders = useMemo<TreeFolder[]>(() => {
    const byFolder = new Map<string, TreeFolder>()

    for (const f of folders) {
      byFolder.set(f.id, { id: f.id, name: f.name, noteIds: [] })
    }

    for (const n of notes) {
      if (!n.folderId) {
        // handled separately
      } else {
        const node = byFolder.get(n.folderId)
        if (node) node.noteIds.push(n.id)
      }
    }

    // Keep same ordering style: folders alpha, notes already sorted in context.
    const folderList = [...byFolder.values()].sort((a, b) => a.name.localeCompare(b.name))
    return folderList
  }, [folders, notes])

  const unfiledNoteIds = useMemo(() => {
    return notes.filter((n) => !n.folderId).map((n) => n.id)
  }, [notes])

  const toggleFolder = (id: string) => {
    setFolderExpansions((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }))
  }

  const renderFolderRow = (f: TreeFolder) => {
    const hasChildren = f.noteIds.length > 0
    const isExpanded = folderExpansions[f.id] ?? false
    const isFolderActive = selectedFolderId === f.id

    const pagination = folderPagination[f.id]
    const showLoadMore = !search.trim() && pagination?.hasMore
    const canExpand = hasChildren || showLoadMore
    if (search.trim() && !hasChildren) {
      return null
    }

    return (
      <div key={f.id}>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'w-full justify-start gap-1 py-1 px-2 text-xs h-7 hover:bg-violet-100/30 dark:hover:bg-violet-900/20',
            isExpanded ? 'bg-violet-200/40 dark:bg-violet-800/30' : '',
          )}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => {
            onSelectFolder(f.id)
            if (hasChildren) {
              setFolderExpansions((prev) => ({ ...prev, [f.id]: !(prev[f.id] ?? false) }))
            }
          }}
        >
          {canExpand ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(f.id)
              }}
              className="flex items-center justify-center w-4 h-4 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded cursor-pointer"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
          ) : (
            <div className="w-4" />
          )}

          {isExpanded && hasChildren ? (
            <FolderOpen size={14} className="text-violet-600 dark:text-violet-400" />
          ) : (
            <Folder size={14} className="text-violet-600 dark:text-violet-400" />
          )}

          <span className="truncate">{f.name}</span>
        </Button>

        {isExpanded && (hasChildren || showLoadMore) ? (
          <div>
            {f.noteIds.map((noteId) => {
              const n = notesById.get(noteId)
              if (!n) return null
              const active = n.id === selectedNoteId
              return (
                <div key={n.id} style={{ paddingLeft: '8px' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-2 py-1 px-2 text-xs h-7 hover:bg-violet-100/30 dark:hover:bg-violet-900/20',
                      active ? 'bg-violet-200/40 dark:bg-violet-800/30' : '',
                    )}
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    onClick={() => onSelectNote(n.id)}
                    title={n.title || 'Untitled'}
                  >
                    <FileText size={14} className="text-neutral-500 dark:text-neutral-400" />
                    <span className="truncate">{n.title || 'Untitled'}</span>
                  </Button>
                </div>
              )
            })}
            {showLoadMore ? (
              <div style={{ paddingLeft: '8px' }}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 py-1 px-2 text-[11px] h-7 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  onClick={() => onLoadMore(f.id)}
                  disabled={pagination?.isLoading}
                >
                  {pagination?.isLoading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="group px-2 py-1 flex items-center justify-between hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 rounded">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => setTreeExpanded(!treeExpanded)}
          >
            {treeExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </Button>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Notes
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={onCreateFolder}
            title="New folder"
          >
            <Plus size={10} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={onCreateNote}
            title="New note"
          >
            <FileText size={10} />
          </Button>
        </div>
      </div>

      {treeExpanded ? (
        <div className="mt-1 px-2">
          <div className="min-w-fit">
            {isLoading ? (
              <div className="px-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">Loading…</div>
            ) : error ? (
              <div className="px-2 py-2 text-xs text-red-500">{error}</div>
            ) : (
              <div className="space-y-0.5 min-w-fit">
                {treeFolders.map(renderFolderRow)}

                {unfiledNoteIds.map((noteId) => {
                  const n = notesById.get(noteId)
                  if (!n) return null
                  const active = n.id === selectedNoteId
                  return (
                    <div key={n.id}>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          'w-full justify-start gap-2 py-1 px-2 text-xs h-7 hover:bg-violet-100/30 dark:hover:bg-violet-900/20',
                          active ? 'bg-violet-200/40 dark:bg-violet-800/30' : '',
                        )}
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                        onClick={() => onSelectNote(n.id)}
                        title={n.title || 'Untitled'}
                      >
                        <FileText size={14} className="text-neutral-500 dark:text-neutral-400" />
                        <span className="truncate">{n.title || 'Untitled'}</span>
                      </Button>
                    </div>
                  )
                })}

                {!search.trim() && folderPagination['__unfiled__']?.hasMore ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start gap-2 py-1 px-2 text-[11px] h-7 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                      onClick={() => onLoadMore(null)}
                      disabled={folderPagination['__unfiled__']?.isLoading}
                    >
                      {folderPagination['__unfiled__']?.isLoading ? 'Loading…' : 'Load more'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

