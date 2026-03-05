import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Folder, FolderOpen, MoreHorizontal, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FolderRecord } from '@/types/folder'
import type { NoteRecord } from '@/types/note'

type TreeFolder = {
  id: string
  name: string
  noteIds: string[]
}

type OpenMenu =
  | { kind: 'folder'; id: string }
  | { kind: 'note'; id: string; showMove: boolean }
  | null

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
  onRenameFolder,
  onDeleteFolder,
  onRenameNote,
  onDeleteNote,
  onMoveNote,
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
  onRenameFolder: (folderId: string, name: string) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
  onRenameNote: (noteId: string, title: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  onMoveNote: (noteId: string, folderId: string | null) => Promise<void>
}) {
  const [treeExpanded, setTreeExpanded] = useState(true)
  const [folderExpansions, setFolderExpansions] = useState<Record<string, boolean>>({})
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return
    const handler = () => setOpenMenu(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
    setOpenMenu(null)
  }

  const commitRename = async (type: 'note' | 'folder', id: string) => {
    const val = renameValue.trim()
    setRenamingId(null)
    setRenameValue('')
    if (!val) return
    if (type === 'folder') await onRenameFolder(id, val)
    else await onRenameNote(id, val)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const notesById = useMemo(() => {
    const map = new Map<string, NoteRecord>()
    for (const n of notes) map.set(n.id, n)
    return map
  }, [notes])

  const treeFolders = useMemo<TreeFolder[]>(() => {
    const byFolder = new Map<string, TreeFolder>()
    for (const f of folders) byFolder.set(f.id, { id: f.id, name: f.name, noteIds: [] })
    for (const n of notes) {
      if (n.folderId) {
        const node = byFolder.get(n.folderId)
        if (node) node.noteIds.push(n.id)
      }
    }
    return [...byFolder.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, notes])

  const unfiledNoteIds = useMemo(() => notes.filter((n) => !n.folderId).map((n) => n.id), [notes])

  const toggleFolder = (id: string) => {
    setFolderExpansions((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }))
  }

  const renderNoteRow = (noteId: string, indented: boolean) => {
    const n = notesById.get(noteId)
    if (!n) return null
    const active = n.id === selectedNoteId
    const isMenuOpen = openMenu?.kind === 'note' && openMenu.id === n.id
    const showMove = isMenuOpen && (openMenu as Extract<OpenMenu, { kind: 'note' }>).showMove

    return (
      <div key={n.id} className="relative group/row min-w-0" style={indented ? { paddingLeft: '8px' } : {}}>
        <div className={cn(
          'flex items-center rounded min-w-0',
          active ? 'bg-violet-200/40 dark:bg-violet-800/30' : 'hover:bg-violet-100/30 dark:hover:bg-violet-900/20',
        )}>
          <button
            type="button"
            className="flex flex-1 min-w-0 items-center gap-2 py-1 px-2 text-xs h-7"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => onSelectNote(n.id)}
            title={n.title || 'Untitled'}
          >
            <FileText size={14} className="flex-shrink-0 text-neutral-500 dark:text-neutral-400" />
            {renamingId === n.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitRename('note', n.id)
                  if (e.key === 'Escape') cancelRename()
                }}
                onBlur={() => void commitRename('note', n.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent outline-none border-b border-violet-400 text-xs"
              />
            ) : (
              <span className="truncate">{n.title || 'Untitled'}</span>
            )}
          </button>
          {renamingId !== n.id && (
            <button
              type="button"
              className="opacity-0 group-hover/row:opacity-100 mr-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded hover:bg-neutral-200 dark:hover:bg-neutral-600"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenu(isMenuOpen ? null : { kind: 'note', id: n.id, showMove: false })
              }}
            >
              <MoreHorizontal size={12} />
            </button>
          )}
        </div>

        {isMenuOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-7 z-50 min-w-[160px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            {!showMove ? (
              <>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  onClick={() => startRename(n.id, n.title || 'Untitled')}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  onClick={() => setOpenMenu({ kind: 'note', id: n.id, showMove: true })}
                >
                  Move to folder
                  <ChevronRight size={12} />
                </button>
                <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={() => { void onDeleteNote(n.id); setOpenMenu(null) }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  onClick={() => setOpenMenu({ kind: 'note', id: n.id, showMove: false })}
                >
                  <ChevronLeft size={12} />
                  Back
                </button>
                <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
                <button
                  type="button"
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700',
                    !n.folderId ? 'font-medium text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 dark:text-neutral-300',
                  )}
                  onClick={() => { void onMoveNote(n.id, null); setOpenMenu(null) }}
                >
                  No folder
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700',
                      n.folderId === f.id ? 'font-medium text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 dark:text-neutral-300',
                    )}
                    onClick={() => { void onMoveNote(n.id, f.id); setOpenMenu(null) }}
                  >
                    {f.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderFolderRow = (f: TreeFolder) => {
    const hasChildren = f.noteIds.length > 0
    const isExpanded = folderExpansions[f.id] ?? false
    const isFolderActive = selectedFolderId === f.id
    const pagination = folderPagination[f.id]
    const showLoadMore = !search.trim() && pagination?.hasMore
    const canExpand = hasChildren || showLoadMore
    const isMenuOpen = openMenu?.kind === 'folder' && openMenu.id === f.id

    if (search.trim() && !hasChildren) return null

    return (
      <div key={f.id} className="relative group/row min-w-0">
        <div className={cn(
          'flex items-center rounded min-w-0',
          isExpanded || isFolderActive ? 'bg-violet-200/40 dark:bg-violet-800/30' : 'hover:bg-violet-100/30 dark:hover:bg-violet-900/20',
        )}>
          <button
            type="button"
            className="flex flex-1 min-w-0 items-center gap-1 py-1 px-2 text-xs h-7"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => {
              onSelectFolder(f.id)
              if (hasChildren) toggleFolder(f.id)
            }}
          >
            {canExpand ? (
              <div
                onClick={(e) => { e.stopPropagation(); toggleFolder(f.id) }}
                className="flex items-center justify-center w-4 h-4 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded cursor-pointer flex-shrink-0"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
            ) : (
              <div className="w-4 flex-shrink-0" />
            )}
            {isExpanded && hasChildren ? (
              <FolderOpen size={14} className="flex-shrink-0 text-violet-600 dark:text-violet-400" />
            ) : (
              <Folder size={14} className="flex-shrink-0 text-violet-600 dark:text-violet-400" />
            )}
            {renamingId === f.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitRename('folder', f.id)
                  if (e.key === 'Escape') cancelRename()
                }}
                onBlur={() => void commitRename('folder', f.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent outline-none border-b border-violet-400 text-xs"
              />
            ) : (
              <span className="truncate text-neutral-700 dark:text-neutral-200">{f.name}</span>
            )}
          </button>
          {renamingId !== f.id && (
            <button
              type="button"
              className="opacity-0 group-hover/row:opacity-100 mr-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded hover:bg-neutral-200 dark:hover:bg-neutral-600"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenu(isMenuOpen ? null : { kind: 'folder', id: f.id })
              }}
            >
              <MoreHorizontal size={12} />
            </button>
          )}
        </div>

        {isMenuOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-7 z-50 min-w-[140px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
              onClick={() => startRename(f.id, f.name)}
            >
              Rename
            </button>
            <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => { void onDeleteFolder(f.id); setOpenMenu(null) }}
            >
              Delete
            </button>
          </div>
        )}

        {isExpanded && (hasChildren || showLoadMore) ? (
          <div>
            {f.noteIds.map((noteId) => renderNoteRow(noteId, true))}
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
          <div className="min-w-0">
            {isLoading ? (
              <div className="px-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">Loading…</div>
            ) : error ? (
              <div className="px-2 py-2 text-xs text-red-500">{error}</div>
            ) : (
              <div className="space-y-0.5 min-w-0">
                {treeFolders.map(renderFolderRow)}

                {unfiledNoteIds.map((noteId) => renderNoteRow(noteId, false))}

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
