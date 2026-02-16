import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Loader2, Search, Sparkles, Trash2 } from 'lucide-react'

import PanelBar from '@/components/PanelBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Response from '@/components/ui/shadcn-io/ai/response'
import { cn } from '@/lib/utils'
import { auth } from '@/config/firebase'
import { createNote, deleteNote, listNotes, updateNote } from '@/lib/notes-client'
import type { NoteRecord } from '@/types/note'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

type NotepadWorkspaceProps = {
  userId?: string
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
}

function formatShortDate(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
}

function excerpt(markdown: string) {
  const text = markdown.replace(/[#*_`>[\]()-]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 'No content yet.'
  return text.length > 90 ? `${text.slice(0, 90).trim()}…` : text
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

export default function NotepadWorkspace({ userId, onMouseDown }: NotepadWorkspaceProps) {
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const selected = useMemo(
    () => (selectedId ? notes.find((n) => n.id === selectedId) ?? null : null),
    [notes, selectedId],
  )

  const [draftTitle, setDraftTitle] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [draftTranscript, setDraftTranscript] = useState('')
  const [draftEnhanced, setDraftEnhanced] = useState('')

  const [noteTab, setNoteTab] = useState<'notes' | 'transcript'>('notes')
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('edit')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)

  const saveTimerRef = useRef<number | null>(null)
  const lastLoadedNoteIdRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const list = await listNotes(userId)
      setNotes(list)
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id)
      }
      if (list.length === 0) {
        const created = await createNote(userId, {
          title: 'New note',
          noteMarkdown: '',
          transcriptText: '',
        })
        setNotes([created])
        setSelectedId(created.id)
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load notes')
    } finally {
      setIsLoading(false)
    }
  }, [selectedId, userId])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Populate drafts when selection changes (avoid clobbering while typing).
  useEffect(() => {
    if (!selected) {
      lastLoadedNoteIdRef.current = null
      setDraftTitle('')
      setDraftNote('')
      setDraftTranscript('')
      setDraftEnhanced('')
      return
    }

    if (lastLoadedNoteIdRef.current === selected.id) {
      return
    }

    lastLoadedNoteIdRef.current = selected.id
    setDraftTitle(selected.title)
    setDraftNote(selected.noteMarkdown)
    setDraftTranscript(selected.transcriptText)
    setDraftEnhanced(selected.aiEnhancedMarkdown)
    setEnhanceError(null)
  }, [selected])

  const scheduleSave = useCallback(
    (next: { title: string; noteMarkdown: string; transcriptText: string; aiEnhancedMarkdown: string }) => {
      if (!selectedId) return
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }

      // Optimistic list update (keeps sidebar snappy).
      setNotes((prev) =>
        prev
          .map((n) =>
            n.id === selectedId
              ? { ...n, ...next, updatedAt: Date.now() }
              : n,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      )

      saveTimerRef.current = window.setTimeout(() => {
        void updateNote(userId, selectedId, next).then((updated) => {
          if (!updated) return
          setNotes((prev) =>
            prev
              .map((n) => (n.id === updated.id ? updated : n))
              .sort((a, b) => b.updatedAt - a.updatedAt),
          )
        })
      }, 450)
    },
    [selectedId, userId],
  )

  useEffect(() => {
    if (!selectedId) return
    scheduleSave({
      title: draftTitle,
      noteMarkdown: draftNote,
      transcriptText: draftTranscript,
      aiEnhancedMarkdown: draftEnhanced,
    })
  }, [draftTitle, draftNote, draftTranscript, draftEnhanced, scheduleSave, selectedId])

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => {
      const hay = `${n.title}\n${n.noteMarkdown}\n${n.transcriptText}`.toLowerCase()
      return hay.includes(q)
    })
  }, [notes, search])

  const handleCreate = useCallback(async () => {
    const created = await createNote(userId, { title: 'New note' })
    setNotes((prev) => [created, ...prev])
    setSelectedId(created.id)
    setNoteMode('edit')
    setNoteTab('notes')
  }, [userId])

  useEffect(() => {
    const listener = () => {
      void handleCreate()
    }
    window.addEventListener('sunless:create-note', listener as EventListener)
    return () => {
      window.removeEventListener('sunless:create-note', listener as EventListener)
    }
  }, [handleCreate])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    const ok = await deleteNote(userId, selectedId)
    if (!ok) return
    setNotes((prev) => prev.filter((n) => n.id !== selectedId))
    setSelectedId((prevSelected) => {
      if (prevSelected !== selectedId) return prevSelected
      const remaining = notes.filter((n) => n.id !== selectedId)
      return remaining[0]?.id ?? null
    })
  }, [notes, selectedId, userId])

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
    } catch (error) {
      setEnhanceError(error instanceof Error ? error.message : 'Failed to enhance note')
    } finally {
      setIsEnhancing(false)
    }
  }, [draftNote, draftTitle, draftTranscript, selectedId, userId])

  return (
    <div className="flex h-[660px] w-full gap-2 overflow-hidden">
      {/* Sidebar: all notes */}
      <div className="flex w-[280px] shrink-0 flex-col gap-1.5">
        <PanelBar
          onMouseDown={onMouseDown}
          title="Notes"
          endAdornment={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full border border-white/15 bg-white/15 px-3 text-xs text-white/70 transition hover:border-white/25 hover:bg-white/20 hover:text-white"
              onClick={() => void handleCreate()}
            >
              New
            </Button>
          }
        />

        <div className="rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="h-9 border-white/10 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-white/20"
            />
          </div>
        </div>

        <div className="attachments-scrollbar flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-2 backdrop-blur-xl">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notes…
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {loadError}
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-full border border-red-500/30 bg-red-500/10 px-3 text-xs text-red-100 transition hover:bg-red-500/20"
                  onClick={() => void refresh()}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/10 px-3 py-6 text-center text-xs text-white/60">
              No notes found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotes.map((note) => {
                const isActive = note.id === selectedId
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left transition',
                      isActive
                        ? 'border-white/35 bg-white/15 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]'
                        : 'border-white/10 bg-white/10 text-white/75 hover:border-white/20 hover:bg-white/15 hover:text-white',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{note.title || 'Untitled note'}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/40">
                        {formatShortDate(note.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/55">
                      {excerpt(note.noteMarkdown)}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main: note + transcript */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <PanelBar
          onMouseDown={onMouseDown}
          title="Your notes + transcript"
          endAdornment={
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 rounded-md bg-white/20 p-0 text-white hover:bg-white/20 hover:text-white"
                title="Delete note"
                aria-label="Delete note"
                onClick={() => void handleDelete()}
                disabled={!selectedId}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-2">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Title…"
              className="h-10 border-white/10 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-white/20"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={noteTab} onValueChange={(v) => setNoteTab(v as 'notes' | 'transcript')}>
                <TabsList className="h-8 rounded-full bg-white/10 p-1">
                  <TabsTrigger value="notes" className="h-6 rounded-full px-3 text-xs">
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="transcript" className="h-6 rounded-full px-3 text-xs">
                    Transcript
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex-1" />

              <Tabs value={noteMode} onValueChange={(v) => setNoteMode(v as 'edit' | 'preview')}>
                <TabsList className="h-8 rounded-full bg-white/10 p-1">
                  <TabsTrigger value="edit" className="h-6 rounded-full px-3 text-xs">
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="h-6 rounded-full px-3 text-xs">
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {noteTab === 'notes' ? (
              noteMode === 'preview' ? (
                <div className="attachments-scrollbar h-full overflow-y-auto px-4 py-3">
                  <Response>{draftNote || '_No notes yet._'}</Response>
                </div>
              ) : (
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="Write your notes in Markdown…"
                  className="attachments-scrollbar h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-white/90 placeholder:text-white/35 outline-none"
                />
              )
            ) : noteMode === 'preview' ? (
              <div className="attachments-scrollbar h-full overflow-y-auto px-4 py-3">
                <Response>{draftTranscript ? draftTranscript : '_No transcript yet._'}</Response>
              </div>
            ) : (
              <textarea
                value={draftTranscript}
                onChange={(e) => setDraftTranscript(e.target.value)}
                placeholder="Paste or type transcript text…"
                className="attachments-scrollbar h-full w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-white/90 placeholder:text-white/35 outline-none"
              />
            )}
          </div>
        </div>
      </div>

      {/* Right: AI enhanced */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <PanelBar
          onMouseDown={onMouseDown}
          title="AI enhanced"
          endAdornment={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-full border border-white/15 bg-white/15 px-3 text-xs text-white/70 transition hover:border-white/25 hover:bg-white/20 hover:text-white"
              onClick={() => void handleEnhance()}
              disabled={!selectedId || isEnhancing}
            >
              {isEnhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Enhance
            </Button>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-xl">
          {enhanceError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {enhanceError}
            </div>
          ) : null}

          {draftEnhanced.trim() ? (
            <div className="attachments-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <Response>{draftEnhanced}</Response>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/10 px-4 py-6 text-center text-sm text-white/60">
              <div className="max-w-sm space-y-2">
                <p className="text-white/70">Turn raw notes + transcript into a clean, shareable doc.</p>
                <p className="text-xs text-white/45">Click “Enhance” to generate an AI-improved version on the right.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

