import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { InfoBanner } from '@/components/ui/info-banner'
import MarkdownEditor from '@/components/MarkdownEditor'
import TranscriptPanel from '@/components/TranscriptPanel'
import { getNote, updateNote } from '@/lib/notes-client'
import type { NoteRecord } from '@/types/note'
import type { LiveTranscriptSegment } from '@/types/live-insight'

type TranscriptionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
const TRANSCRIPT_WARNING_TEXT =
  'The transcript may show repeated sentences without headphones, but your final notes will be unaffected. For the best experience, use headphones.'

type CompactMeetingPanelProps = {
  noteId: string
  userId?: string
  transcriptSegments?: LiveTranscriptSegment[]
  transcriptStatus?: TranscriptionStatus
  transcriptionMode?: 'live' | 'notes_only'
  transcriptionNotice?: string | null
  onResumeTranscription?: () => void
}

export default function CompactMeetingPanel({
  noteId,
  userId,
  transcriptSegments,
  transcriptStatus,
  transcriptionMode = 'live',
  transcriptionNotice = null,
  onResumeTranscription,
}: CompactMeetingPanelProps) {
  const [note, setNote] = useState<NoteRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<'original' | 'transcript'>('original')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNote, setDraftNote] = useState('')

  const saveTimerRef = useRef<number | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)
  const isHydratingDraftsRef = useRef(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const loaded = await getNote(userId, noteId)
      setNote(loaded)
      if (!loaded) {
        setError('Note not found')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load note')
    } finally {
      setIsLoading(false)
    }
  }, [noteId, userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!note) return
    if (lastLoadedIdRef.current === note.id) return
    lastLoadedIdRef.current = note.id
    isHydratingDraftsRef.current = true
    setDraftTitle(note.title)
    setDraftNote(note.noteMarkdown)
  }, [note])

  const scheduleSave = useCallback(
    (patch: { title: string; noteMarkdown: string }) => {
      if (!noteId) return
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)

      saveTimerRef.current = window.setTimeout(() => {
        void updateNote(userId, noteId, patch).then((updated) => {
          if (updated) setNote(updated)
        })
      }, 350)
    },
    [noteId, userId],
  )

  useEffect(() => {
    if (!noteId) return
    if (isHydratingDraftsRef.current) {
      isHydratingDraftsRef.current = false
      return
    }
    scheduleSave({
      title: draftTitle,
      noteMarkdown: draftNote,
    })
  }, [draftTitle, draftNote, noteId, scheduleSave])

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-5 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )
    }
    if (error) {
      return (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-5 text-sm text-red-100">
          {error}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1.5">
        <Input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Meeting title…"
          className="h-8 border-white/10 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-white/20"
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'original' | 'transcript')}>
          <TabsList className="h-8 rounded-full bg-white/10 p-1">
            <TabsTrigger value="original" className="h-6 rounded-full px-3 text-xs">
              Original
            </TabsTrigger>
            <TabsTrigger value="transcript" className="h-6 rounded-full px-3 text-xs">
              Transcript
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="min-h-[220px] overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {tab === 'original' ? (
            <MarkdownEditor
              markdown={draftNote}
              onChange={setDraftNote}
              placeholder="Write notes in Markdown…"
              theme="dark"
              className="min-h-[220px]"
              noteId={noteId}
            />
          ) : (
            <div className="attachments-scrollbar min-h-[220px] overflow-y-auto px-2.5 py-2 text-sm leading-relaxed text-white/90">
              {transcriptionNotice ? (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100">
                  <span>{transcriptionNotice}</span>
                  {transcriptionMode === 'notes_only' && onResumeTranscription ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 bg-violet-600 px-2.5 text-[11px] text-white hover:bg-violet-700"
                      onClick={onResumeTranscription}
                    >
                      Resume transcription
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {transcriptSegments && transcriptSegments.length > 0 ? (
                <TranscriptPanel
                  segments={transcriptSegments}
                  status={
                    transcriptionMode === 'notes_only'
                      ? 'disabled'
                      : transcriptStatus === 'connected'
                        ? 'live'
                        : transcriptStatus === 'connecting'
                          ? 'paused'
                          : 'disabled'
                  }
                  isProcessing={transcriptionMode !== 'notes_only' && transcriptStatus === 'connecting'}
                  appearance="embedded"
                  className="min-h-[220px]"
                />
              ) : (
                <>
                  <InfoBanner className="mb-2">
                    {TRANSCRIPT_WARNING_TEXT}
                  </InfoBanner>
                  <p className="text-white/45">
                    {transcriptionMode === 'notes_only'
                      ? 'Transcript is paused. Continue taking notes.'
                      : 'Transcript text will appear here.'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    )
  }, [
    draftNote,
    draftTitle,
    error,
    isLoading,
    noteId,
    onResumeTranscription,
    tab,
    transcriptSegments,
    transcriptStatus,
    transcriptionMode,
    transcriptionNotice,
  ])

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-2 backdrop-blur-xl">
        {content}
      </div>
    </div>
  )
}
