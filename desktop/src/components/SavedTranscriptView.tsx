import { useCallback, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { updateSpeaker, type TranscriptSpeaker, type TranscriptSegment } from '@/lib/transcript-client'

const SPEAKER_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
] as const

function getSpeakerColor(speaker: TranscriptSpeaker, index: number): string {
  if (speaker.color) return speaker.color
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
}

type SavedTranscriptViewProps = {
  speakers: TranscriptSpeaker[]
  segments: TranscriptSegment[]
  loading: boolean
  onSpeakerUpdated: (speakerId: string, updates: { label?: string; color?: string }) => void
  theme?: 'light' | 'dark'
}

export default function SavedTranscriptView({
  speakers,
  segments,
  loading,
  onSpeakerUpdated,
  theme = 'light',
}: SavedTranscriptViewProps) {
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorDebounceRef = useRef<number | null>(null)

  const speakerIds = new Set(segments.map((s) => s.speaker_id))
  const activeSpeakers = speakers.filter((s) => speakerIds.has(s.id))

  const speakerIndexMap = new Map<string, number>()
  activeSpeakers.forEach((s, i) => speakerIndexMap.set(s.id, i))

  const startEditing = useCallback((speaker: TranscriptSpeaker) => {
    setEditingSpeakerId(speaker.id)
    setEditingLabel(speaker.label)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const commitRename = useCallback(async () => {
    if (!editingSpeakerId) return
    const trimmed = editingLabel.trim()
    const speaker = speakers.find((s) => s.id === editingSpeakerId)
    if (!trimmed || trimmed === speaker?.label) {
      setEditingSpeakerId(null)
      return
    }
    setSaving(true)
    try {
      await updateSpeaker(editingSpeakerId, { label: trimmed })
      onSpeakerUpdated(editingSpeakerId, { label: trimmed })
    } catch {
      // revert silently
    } finally {
      setSaving(false)
      setEditingSpeakerId(null)
    }
  }, [editingSpeakerId, editingLabel, speakers, onSpeakerUpdated])

  const handleColorChange = useCallback(
    (speakerId: string, color: string) => {
      onSpeakerUpdated(speakerId, { color })
      if (colorDebounceRef.current) window.clearTimeout(colorDebounceRef.current)
      colorDebounceRef.current = window.setTimeout(() => {
        void updateSpeaker(speakerId, { color })
      }, 300)
    },
    [onSpeakerUpdated],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void commitRename()
      } else if (e.key === 'Escape') {
        setEditingSpeakerId(null)
      }
    },
    [commitRename],
  )

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white/45' : 'text-neutral-500 dark:text-neutral-400'}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading transcript…
      </div>
    )
  }

  if (segments.length === 0) {
    return (
      <p className={theme === 'dark' ? 'text-white/45' : 'text-neutral-500 dark:text-neutral-400'}>
        No transcript yet.
      </p>
    )
  }

  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-neutral-200 dark:border-neutral-700'
  const inputBg = theme === 'dark'
    ? 'border-white/20 bg-white/10 text-white'
    : 'border-neutral-300 bg-neutral-50 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50'

  return (
    <div className="space-y-3">
      {/* Speakers panel */}
      <div className={`flex flex-wrap gap-2 border-b pb-2.5 ${borderColor}`}>
        {activeSpeakers.map((speaker, idx) => {
          const color = getSpeakerColor(speaker, idx)
          const isEditing = editingSpeakerId === speaker.id

          return (
            <div key={speaker.id} className="flex items-center gap-1.5">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(speaker.id, e.target.value)}
                className="h-5 w-5 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
              />
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={() => void commitRename()}
                  onKeyDown={handleKeyDown}
                  disabled={saving}
                  className={`w-24 rounded px-1 py-0.5 text-xs font-medium outline-none ${inputBg}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEditing(speaker)}
                  className={`rounded px-1 py-0.5 text-xs font-medium transition-colors ${
                    theme === 'dark'
                      ? 'text-white/70 hover:bg-white/10 hover:text-white'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                  }`}
                >
                  {speaker.label}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Transcript body */}
      <div className="space-y-1.5">
        {segments.map((seg) => {
          const speaker = activeSpeakers.find((s) => s.id === seg.speaker_id)
          const speakerIdx = speaker ? speakerIndexMap.get(speaker.id) ?? 0 : 0
          const color = speaker ? getSpeakerColor(speaker, speakerIdx) : SPEAKER_COLORS[0]

          return (
            <div key={seg.id}>
              <span className="font-medium" style={{ color }}>
                {speaker?.label ?? 'Speaker'}:
              </span>
              {' '}
              {seg.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}
