import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, Folder, Loader2, Sparkles, FileText, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { InfoBanner } from '@/components/ui/info-banner'
import { updateNote, enhanceNote } from '@/lib/notes-client'
import { getTranscriptSegments, type TranscriptSegment } from '@/lib/transcript-client'
import SavedTranscriptView from '@/components/SavedTranscriptView'
import MarkdownEditor from '@/components/MarkdownEditor'
import DashboardHome from '@/components/DashboardHome'
import { useDashboardNotes } from '@/contexts/DashboardNotesContext'

type DashboardWorkspaceProps = {
  userId?: string
}

export default function DashboardWorkspace({ userId }: DashboardWorkspaceProps) {
  const { folders, selectedId, selected, optimisticPatch, replaceNote } = useDashboardNotes()

  const [draftTitle, setDraftTitle] = useState('')
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)
  const folderPickerRef = useRef<HTMLDivElement | null>(null)
  const [draftFolderId, setDraftFolderId] = useState('')
  const [draftNote, setDraftNote] = useState('')

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)

  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const transcriptLoadedForRef = useRef<string | null>(null)

  const saveTimerRef = useRef<number | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)
  const isHydratingDraftsRef = useRef(false)

  // Hydrate drafts when a note is selected
  useEffect(() => {
    if (!selected) {
      lastLoadedIdRef.current = null
      isHydratingDraftsRef.current = false
      setDraftTitle('')
      setDraftFolderId('')
      setDraftNote('')
      setTranscriptOpen(false)
      return
    }
    if (lastLoadedIdRef.current === selected.id) return
    lastLoadedIdRef.current = selected.id
    isHydratingDraftsRef.current = true
    setDraftTitle(selected.title)
    setDraftFolderId(selected.folderId ?? '')
    setDraftNote(selected.noteMarkdown)
    setEnhanceError(null)
  }, [selected])

  // Close folder picker on outside click / escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(event.target as Node)) {
        setFolderPickerOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFolderPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Load transcript when sidebar opens
  useEffect(() => {
    if (!transcriptOpen || !selectedId) return
    if (transcriptLoadedForRef.current === selectedId) return
    transcriptLoadedForRef.current = selectedId
    setTranscriptLoading(true)
    void getTranscriptSegments(selectedId)
      .then(({ segments }) => { setTranscriptSegments(segments) })
      .catch(() => { setTranscriptSegments([]) })
      .finally(() => setTranscriptLoading(false))
  }, [transcriptOpen, selectedId])

  // Reset transcript when note changes
  useEffect(() => {
    transcriptLoadedForRef.current = null
    setTranscriptSegments([])
  }, [selectedId])

  // Auto-save with debounce
  const scheduleSave = useCallback(
    (patch: {
      title: string
      folderId?: string
      noteMarkdown: string
    }) => {
      if (!selectedId) return
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)

      optimisticPatch(selectedId, patch)

      saveTimerRef.current = window.setTimeout(() => {
        void updateNote(userId, selectedId, patch).then((updated) => {
          if (!updated) return
          replaceNote(updated)
        })
      }, 400)
    },
    [optimisticPatch, replaceNote, selectedId, userId],
  )

  // Trigger save on draft changes
  useEffect(() => {
    if (!selectedId) return
    if (lastLoadedIdRef.current !== selectedId) return
    if (isHydratingDraftsRef.current) {
      isHydratingDraftsRef.current = false
      return
    }
    scheduleSave({
      title: draftTitle,
      folderId: draftFolderId || '',
      noteMarkdown: draftNote,
    })
  }, [draftTitle, draftFolderId, draftNote, scheduleSave, selectedId])

  // Enhance: save version, overwrite note in-place
  const handleEnhance = useCallback(async () => {
    if (!selectedId) return
    setIsEnhancing(true)
    setEnhanceError(null)
    try {
      const { note } = await enhanceNote(selectedId)
      isHydratingDraftsRef.current = true
      setDraftNote(note.noteMarkdown)
      replaceNote(note)
    } catch (error) {
      setEnhanceError(error instanceof Error ? error.message : 'Failed to enhance note')
    } finally {
      setIsEnhancing(false)
    }
  }, [replaceNote, selectedId])

  if (!selectedId) {
    return (
      <div className="h-full">
        <DashboardHome />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 gap-2">

      {/* ── Main panel ── */}
      <div className="relative flex min-w-0 flex-1 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">

        {/* Title row */}
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            placeholder="Untitled note"
            disabled={!selectedId}
            className="h-9 min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50 dark:placeholder:text-neutral-500"
          />
          <div ref={folderPickerRef} className="relative" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
            <Button
              type="button"
              variant="ghost"
              disabled={!selectedId}
              onClick={() => setFolderPickerOpen((v) => !v)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <Folder className="h-3.5 w-3.5" />
              <span>{draftFolderId ? (folders.find((f) => f.id === draftFolderId)?.name ?? 'Folder') : 'No folder'}</span>
            </Button>
            {folderPickerOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[160px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                <div className="px-3 py-1.5 text-xs text-neutral-400 dark:text-neutral-500">Add to folder</div>
                {[{ id: '', name: 'No folder' }, ...folders].map((f, i) => {
                  const active = (f.id === '' && !draftFolderId) || f.id === draftFolderId
                  return (
                    <Fragment key={f.id || '__none__'}>
                      {i === 1 && folders.length > 0 && (
                        <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setDraftFolderId(f.id); setFolderPickerOpen(false) }}
                        className="mx-1 h-8 w-[calc(100%-8px)] justify-start gap-2 rounded-md px-3 text-sm font-normal text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
                      >
                        <span className="w-3.5">{active ? <Check className="h-3.5 w-3.5" /> : null}</span>
                        <Folder className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                        {f.name}
                      </Button>
                    </Fragment>
                  )
                })}
              </div>
            )}
          </div>
          {/* Transcript toggle */}
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            title={transcriptOpen ? 'Hide transcript' : 'Show transcript'}
            className={
              transcriptOpen
                ? 'flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white dark:bg-neutral-700 dark:text-white'
                : 'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
          >
            <FileText className="h-3 w-3" />
            Transcript
          </button>
        </div>

        {enhanceError ? (
          <div className="m-2.5 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {enhanceError}
          </div>
        ) : null}

        {/* Editor */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <MarkdownEditor
            markdown={draftNote}
            onChange={setDraftNote}
            placeholder="Markdown notes…"
            theme="auto"
            showToolbar
            className="h-full dashboard-editor"
            noteId={selectedId}
          />
        </div>

        {/* Enhance button */}
        {selectedId ? (
          <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-1.5">
              <Button
                type="button"
                className="border-0 bg-violet-600 text-white shadow-md hover:bg-violet-700 focus-visible:ring-violet-400"
                onClick={() => void handleEnhance()}
                disabled={!selectedId || isEnhancing || !draftNote.trim()}
              >
                {isEnhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Enhance
              </Button>
            </div>
          </div>
        ) : null}

      </div>

      {/* ── Transcript sidebar ── */}
      {transcriptOpen && (
        <div className="flex w-80 flex-shrink-0 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Transcript</span>
            <button
              type="button"
              onClick={() => setTranscriptOpen(false)}
              className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sidebar-scrollbar">
            <InfoBanner className="mb-2">
              The transcript may show repeated sentences without headphones, but your final notes will be unaffected. For the best experience, use headphones.
            </InfoBanner>
            <SavedTranscriptView
              segments={transcriptSegments}
              loading={transcriptLoading}
              theme="light"
            />
          </div>
        </div>
      )}

    </div>
  )
}
