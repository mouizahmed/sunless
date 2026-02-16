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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Response from '@/components/ui/shadcn-io/ai/response'
import { auth } from '@/config/firebase'
import { updateNote } from '@/lib/notes-client'
import MarkdownEditor from '@/components/MarkdownEditor'
import { useDashboardNotes } from '@/contexts/DashboardNotesContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
const UNFILED_VALUE = '__unfiled__'

type DashboardWorkspaceProps = {
  userId?: string
}

async function enhanceNote(params: { title: string; noteMarkdown: string; transcriptText: string }) {
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
      transcript_text: params.transcriptText,
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
  const [tab, setTab] = useState<'original' | 'transcript' | 'enhanced'>('original')

  const [draftTitle, setDraftTitle] = useState('')
  const [draftFolderId, setDraftFolderId] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [draftTranscript, setDraftTranscript] = useState('')
  const [draftEnhanced, setDraftEnhanced] = useState('')

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)

  const saveTimerRef = useRef<number | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)
  const isHydratingDraftsRef = useRef(false)

  useEffect(() => {
    if (!selected) {
      lastLoadedIdRef.current = null
      isHydratingDraftsRef.current = false
      setDraftTitle('')
      setDraftFolderId('')
      setDraftNote('')
      setDraftTranscript('')
      setDraftEnhanced('')
      setTab('original')
      return
    }
    if (lastLoadedIdRef.current === selected.id) return
    lastLoadedIdRef.current = selected.id
    // Prevent autosave from firing due to draft hydration when switching selection.
    isHydratingDraftsRef.current = true
    setDraftTitle(selected.title)
    setDraftFolderId(selected.folderId ?? '')
    setDraftNote(selected.noteMarkdown)
    setDraftTranscript(selected.transcriptText)
    setDraftEnhanced(selected.aiEnhancedMarkdown)
    setEnhanceError(null)

    // If enhanced doesn't exist on this note, keep user on original/transcript.
    if (!selected.aiEnhancedMarkdown?.trim() && tab === 'enhanced') {
      setTab('original')
    }
  }, [selected])

  const scheduleSave = useCallback(
    (patch: {
      title: string
      folderId?: string
      noteMarkdown: string
      transcriptText: string
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
      transcriptText: draftTranscript,
      aiEnhancedMarkdown: draftEnhanced,
    })
  }, [draftTitle, draftFolderId, draftNote, draftTranscript, draftEnhanced, scheduleSave, selectedId])

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
        transcriptText: draftTranscript,
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
  }, [draftNote, draftTitle, draftTranscript, optimisticPatch, selectedId, userId])

  return (
    <div className="h-full">
      <div className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title…"
            className="h-9 border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            disabled={!selectedId}
          />
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'original' | 'transcript' | 'enhanced')}>
            <TabsList className="h-9 rounded-md bg-neutral-100 p-1 dark:bg-neutral-950">
              <TabsTrigger value="original" className="h-7 rounded-md px-3 text-xs">
                Original
              </TabsTrigger>
              <TabsTrigger value="transcript" className="h-7 rounded-md px-3 text-xs">
                Transcript
              </TabsTrigger>
              {draftEnhanced.trim() ? (
                <TabsTrigger value="enhanced" className="h-7 rounded-md px-3 text-xs">
                  Enhanced
                </TabsTrigger>
              ) : null}
            </TabsList>
          </Tabs>
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
          <div className="m-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {enhanceError}
          </div>
        ) : null}

        <div className="flex-1 overflow-hidden">
          {!selectedId ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-neutral-500 dark:text-neutral-400">
              Select a note from the sidebar.
            </div>
          ) : tab === 'original' ? (
            <MarkdownEditor
              markdown={draftNote}
              onChange={setDraftNote}
              placeholder="Markdown notes…"
              theme="auto"
              showToolbar
              className="h-full"
              noteId={selectedId}
            />
          ) : tab === 'transcript' ? (
            <textarea
              value={draftTranscript}
              onChange={(e) => setDraftTranscript(e.target.value)}
              placeholder="Transcript…"
              className="h-full w-full resize-none bg-transparent p-3 text-sm text-neutral-900 outline-none dark:text-neutral-50"
            />
          ) : (
            <div className="h-full overflow-y-auto p-3 sidebar-scrollbar">
              {draftEnhanced.trim() ? (
                <Response>{draftEnhanced}</Response>
              ) : (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                  Click “Enhance notes” to generate a cleaned-up, shareable doc.
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <Button type="button" className="w-full" onClick={() => void handleEnhance()} disabled={!selectedId || isEnhancing}>
            {isEnhancing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Enhance notes
          </Button>
        </div>
      </div>
    </div>
  )
}
