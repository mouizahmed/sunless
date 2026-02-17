import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Folder, Grid3X3, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useWindowState } from '@/hooks/useWindowState'
import { useDashboardNotes } from '@/contexts/DashboardNotesContext'

export default function DashboardTopBar({
  onBackToOverlay,
}: {
  onBackToOverlay: () => void
}) {
  const isMacOS = window.env?.platform === 'darwin'
  const { isMaximized } = useWindowState()
  const {
    folders,
    notes,
    selectFolder,
    selectNote,
  } = useDashboardNotes()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)

  const query = searchQuery.trim().toLowerCase()
  const filteredFolders = useMemo(
    () =>
      folders
        .filter((folder) => !query || folder.name.toLowerCase().includes(query))
        .slice(0, 6),
    [folders, query],
  )
  const filteredMeetings = useMemo(
    () =>
      notes
        .filter((note) => {
          if (!query) return true
          const haystack = `${note.title}\n${note.noteMarkdown}\n${note.transcriptText}\n${note.aiEnhancedMarkdown}`.toLowerCase()
          return haystack.includes(query)
        })
        .slice(0, 8),
    [notes, query],
  )

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current) return
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div
      className="relative flex h-12 w-full items-center justify-between px-2 text-sm"
      style={
        {
          paddingLeft: isMacOS && !isMaximized ? '80px' : undefined,
          paddingRight: !isMacOS ? '140px' : undefined,
        } as React.CSSProperties
      }
    >
      <div
        className="absolute bottom-0 left-0 top-0 z-0"
        style={
          {
            right: isMacOS ? '0px' : '140px',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties
        }
      />
      <div className="relative z-10 flex items-center gap-2">
        <img src="./logo.png" alt="Sunless Logo" className="h-6 w-6" />
        <SidebarTrigger />

        <div
          ref={searchContainerRef}
          className="relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
            <Search size={12} className="text-neutral-500 dark:text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearchOpen(true)
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search people, folders, companies, or meetings"
              className="h-6 w-[420px] border-0 !bg-transparent dark:!bg-transparent shadow-none p-0 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 dark:text-neutral-100"
            />
          </div>

          {isSearchOpen ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[520px] overflow-hidden rounded-xl border border-neutral-700/70 bg-[#2a2a2b]/95 text-neutral-100 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-neutral-700/70 px-3 py-2">
                <span className="text-[11px] text-neutral-300">
                  Search people, folders, companies, or meetings
                </span>
                <span className="rounded border border-neutral-600/80 px-1.5 py-0.5 text-[10px] text-neutral-300">
                  ESC
                </span>
              </div>

              <div className="sidebar-scrollbar max-h-[340px] overflow-y-auto p-2">
                <div className="mb-1 px-1 text-xs font-semibold text-neutral-400">Folders</div>
                {filteredFolders.length > 0 ? (
                  <div className="space-y-1">
                    {filteredFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-neutral-100 hover:bg-white/10"
                        onClick={() => {
                          selectFolder(folder.id)
                          setIsSearchOpen(false)
                        }}
                      >
                        <Folder size={14} className="text-neutral-300" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-2 text-xs text-neutral-500">No folders</div>
                )}

                <div className="mb-1 mt-3 px-1 text-xs font-semibold text-neutral-400">Meetings</div>
                {filteredMeetings.length > 0 ? (
                  <div className="space-y-1">
                    {filteredMeetings.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-neutral-100 hover:bg-white/10"
                        onClick={() => {
                          selectNote(note.id)
                          selectFolder(note.folderId ?? null)
                          setIsSearchOpen(false)
                        }}
                      >
                        <span className="text-sm text-neutral-300">•</span>
                        <span className="truncate">{note.title || 'Untitled meeting'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-2 text-xs text-neutral-500">No meetings</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-2 text-xs leading-none hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={onBackToOverlay}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Grid3X3 size={14} />
          Back to overlay
        </Button>
      </div>
    </div>
  )
}
