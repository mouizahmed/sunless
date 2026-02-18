import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Loader2, Sparkles, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Response from '@/components/ui/shadcn-io/ai/response'
import { InfoBanner } from '@/components/ui/info-banner'
import { auth } from '@/config/firebase'
import { updateNote } from '@/lib/notes-client'
import { getTranscriptSegments, type TranscriptSpeaker, type TranscriptSegment } from '@/lib/transcript-client'
import SavedTranscriptView from '@/components/SavedTranscriptView'
import MarkdownEditor from '@/components/MarkdownEditor'
import DashboardHome from '@/components/DashboardHome'
import { useDashboardNotes } from '@/contexts/DashboardNotesContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
const UNFILED_VALUE = '__unfiled__'

type DashboardWorkspaceProps = {
  userId?: string
}

async function enhanceNote(params: { title: string; noteMarkdown: string }) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Not authenticated')
  const idToken = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE_URL}/notes/enhance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      title: params.title,
      note_markdown: params.noteMarkdown,
    }),
  })

  if (!response.ok) {
    let message = 'Failed to enhance note'
    try {
      const payload = (await response.json()) as { error?: string; details?: string }
      message = payload.details || payload.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const payload = (await response.json()) as { enhanced_markdown?: string }
  return payload.enhanced_markdown ?? ''
}

export default function DashboardWorkspace({ userId }: DashboardWorkspaceProps) {
  const { folders, selectedId, selected, deleteById, optimisticPatch, replaceNote } = useDashboardNotes()
  const [tab, setTab] = useState<'original' | 'enhanced'>('original')
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const [draftTitle, setDraftTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [draftFolderId, setDraftFolderId] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [draftEnhanced, setDraftEnhanced] = useState('')

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)

  const [transcriptSpeakers, setTranscriptSpeakers] = useState<TranscriptSpeaker[]>([])
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const transcriptLoadedForRef = useRef<string | null>(null)

  const saveTimerRef = useRef<number | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)
  const isHydratingDraftsRef = useRef(false)
  const transcriptMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selected) {
      lastLoadedIdRef.current = null
      isHydratingDraftsRef.current = false
      setDraftTitle('')
      setDraftFolderId('')
      setDraftNote('')
      setDraftEnhanced('')
      setTab('original')
      setTranscriptOpen(false)
      return
    }
    if (lastLoadedIdRef.current === selected.id) return
    lastLoadedIdRef.current = selected.id
    // Prevent autosave from firing due to draft hydration when switching selection.
    isHydratingDraftsRef.current = true
    setDraftTitle(selected.title)
    setDraftFolderId(selected.folderId ?? '')
    setDraftNote(selected.noteMarkdown)
    setDraftEnhanced(selected.aiEnhancedMarkdown)
    setEnhanceError(null)

    // If enhanced doesn't exist on this note, keep user on original.
    if (!selected.aiEnhancedMarkdown?.trim() && tab === 'enhanced') {
      setTab('original')
    }
  }, [selected, tab])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!transcriptMenuRef.current) return
      if (!transcriptMenuRef.current.contains(event.target as Node)) {
        setTranscriptOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTranscriptOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!transcriptOpen || !selectedId) return
    if (transcriptLoadedForRef.current === selectedId) return
    transcriptLoadedForRef.current = selectedId
    setTranscriptLoading(true)
    void getTranscriptSegments(selectedId)
      .then(({ speakers, segments }) => {
        setTranscriptSpeakers(speakers)
        setTranscriptSegments(segments)
      })
      .catch(() => {
        setTranscriptSpeakers([])
        setTranscriptSegments([])
      })
      .finally(() => setTranscriptLoading(false))
  }, [transcriptOpen, selectedId])

  // Reset transcript cache when note changes
  useEffect(() => {
    transcriptLoadedForRef.current = null
    setTranscriptSegments([])
    setTranscriptSpeakers([])
  }, [selectedId])

  const handleSpeakerUpdated = useCallback((speakerId: string, updates: { label?: string; color?: string }) => {
    setTranscriptSpeakers((prev) =>
      prev.map((s) => (s.id === speakerId ? { ...s, ...updates } : s)),
    )
  }, [])

  const scheduleSave = useCallback(
    (patch: {
      title: string
      folderId?: string
      noteMarkdown: string
      aiEnhancedMarkdown: string
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

  useEffect(() => {
    if (!selectedId) return
    // Important: when switching selection, `selectedId` updates before draft hydration runs.
    // If we save during that gap, we would write the *previous note's drafts* into the
    // newly selected note, bumping `updatedAt` and re-sorting the list.
    if (lastLoadedIdRef.current !== selectedId) return
    if (isHydratingDraftsRef.current) {
      isHydratingDraftsRef.current = false
      return
    }
    scheduleSave({
      title: draftTitle,
      folderId: draftFolderId || '',
      noteMarkdown: draftNote,
      aiEnhancedMarkdown: draftEnhanced,
    })
  }, [draftTitle, draftFolderId, draftNote, draftEnhanced, scheduleSave, selectedId])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    await deleteById(selectedId)
  }, [deleteById, selectedId])

  const handleEnhance = useCallback(async () => {
    if (!selectedId) return
    setIsEnhancing(true)
    setEnhanceError(null)
    try {
      const enhanced = await enhanceNote({
        title: draftTitle,
        noteMarkdown: draftNote,
      })
      setDraftEnhanced(enhanced)
      await updateNote(userId, selectedId, { aiEnhancedMarkdown: enhanced })
      optimisticPatch(selectedId, { aiEnhancedMarkdown: enhanced })
      setTab('enhanced')
    } catch (error) {
      setEnhanceError(error instanceof Error ? error.message : 'Failed to enhance note')
    } finally {
      setIsEnhancing(false)
    }
  }, [draftNote, draftTitle, optimisticPatch, selectedId, userId])

  if (!selectedId) {
    return (
      <div className="h-full">
        <DashboardHome />
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="relative flex h-full min-h-0 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-2.5 py-2 dark:border-neutral-800">
          {editingTitle ? (
            <Input
              ref={titleInputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault()
                  setEditingTitle(false)
                }
              }}
              placeholder="Title…"
              className="h-9 border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            />
          ) : (
            <button
              type="button"
              disabled={!selectedId}
              onClick={() => {
                setEditingTitle(true)
                setTimeout(() => titleInputRef.current?.select(), 0)
              }}
              className="h-9 min-w-0 flex-1 truncate rounded-md px-3 text-left text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800"
            >
              {draftTitle || 'Untitled note'}
            </button>
          )}
          <Select
            value={draftFolderId ? draftFolderId : UNFILED_VALUE}
            onValueChange={(v) => setDraftFolderId(v === UNFILED_VALUE ? '' : v)}
            disabled={!selectedId}
          >
            <SelectTrigger
              className="h-9 w-40 border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50"
              style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            >
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <SelectItem value={UNFILED_VALUE}>Unfiled</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-md bg-neutral-100 p-1 dark:bg-neutral-950">
            <div ref={transcriptMenuRef} className="relative">
              <Button
                type="button"
                variant="ghost"
                className="h-7 rounded-md px-3 text-xs"
                onClick={() => setTranscriptOpen((open) => !open)}
                style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
              >
                Transcript
              </Button>

                {selectedId && transcriptOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-30 w-[420px] rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
                  style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
                >
                  <div className="border-b border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                    Transcript
                  </div>
                  <InfoBanner className="rounded-none border-0 border-b border-violet-400/40">
                    The transcript may show repeated sentences without headphones, but your final notes will be unaffected. For the best experience, use headphones.
                  </InfoBanner>
                  <div className="h-44 w-full overflow-y-auto p-2.5 text-sm text-neutral-900 dark:text-neutral-50">
                    <SavedTranscriptView
                      speakers={transcriptSpeakers}
                      segments={transcriptSegments}
                      loading={transcriptLoading}
                      onSpeakerUpdated={handleSpeakerUpdated}
                      theme="light"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            {draftEnhanced.trim() ? (
              <Button
                type="button"
                variant="ghost"
                className={`h-7 rounded-md px-3 text-xs ${tab === 'enhanced' ? 'bg-white dark:bg-neutral-800' : ''}`}
                onClick={() => setTab((current) => (current === 'enhanced' ? 'original' : 'enhanced'))}
                style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
              >
                Enhanced
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
            onClick={() => void handleDelete()}
            title="Delete note"
            disabled={!selectedId}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {enhanceError ? (
          <div className="m-2.5 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {enhanceError}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === 'original' ? (
            <MarkdownEditor
              markdown={draftNote}
              onChange={setDraftNote}
              placeholder="Markdown notes…"
              theme="auto"
              showToolbar
              className="h-full dashboard-editor"
              noteId={selectedId}
            />
          ) : (
            <div className="h-full overflow-y-auto p-2.5 sidebar-scrollbar">
              {draftEnhanced.trim() ? (
                <Response>{draftEnhanced}</Response>
              ) : (
                <div className="rounded-md border border-neutral-200 p-2.5 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                  Click “Enhance notes” to generate a cleaned-up, shareable doc.
                </div>
              )}
            </div>
          )}

        </div>

        {selectedId && tab === 'original' ? (
          <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-20 -translate-x-1/2">
            <Button
              type="button"
              className="pointer-events-auto border-0 bg-violet-600 text-white shadow-md hover:bg-violet-700 focus-visible:ring-violet-400"
              onClick={() => void handleEnhance()}
              disabled={!selectedId || isEnhancing}
            >
              {isEnhancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Enhance notes
            </Button>
          </div>
        ) : null}

      </div>
    </div>
  )
}
