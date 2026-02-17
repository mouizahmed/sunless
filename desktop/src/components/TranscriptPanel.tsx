import { useMemo } from 'react'

import type { LiveTranscriptSegment } from '@/types/live-insight'
import { cn } from '@/lib/utils'

type TranscriptPanelProps = {
  segments: LiveTranscriptSegment[]
  status: 'live' | 'paused' | 'disabled'
  isProcessing?: boolean
  appearance?: 'default' | 'embedded'
  className?: string
}

const KNOWN_SPEAKER_LABELS: Record<string, string> = {
  user: 'You',
  assistant: 'Sunless',
  system: 'System',
}

function getSpeakerLabel(segment: LiveTranscriptSegment): string {
  if (segment.speakerLabel) return segment.speakerLabel
  const speaker = segment.speaker ?? 'assistant'
  return KNOWN_SPEAKER_LABELS[speaker] ?? speaker
}

function splitDisplayLines(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const sentences = normalized.split(/(?<=[.!?])\s+/)
  const lines: string[] = []
  let current = ''

  const MAX_WORDS_PER_LINE = 26
  const MAX_CHARS_PER_LINE = 180

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    const wordCount = candidate.split(/\s+/).filter(Boolean).length

    if (!current || (wordCount <= MAX_WORDS_PER_LINE && candidate.length <= MAX_CHARS_PER_LINE)) {
      current = candidate
      continue
    }

    lines.push(current)
    current = sentence
  }

  if (current) lines.push(current)
  return lines
}

export default function TranscriptPanel({
  segments,
  status,
  isProcessing = false,
  appearance = 'default',
  className,
}: TranscriptPanelProps) {
  const content = useMemo(() => {
    if (segments.length === 0) {
      if (status === 'disabled') {
        return "Live transcript isn't available right now."
      }

      if (isProcessing) {
        return 'Listening… I’ll drop notes here as soon as I hear something worth capturing.'
      }

      return 'I’ll jot down a running transcript here once the live session gets going.'
    }

    return null
  }, [segments.length, status, isProcessing])

  const groupedSegments = useMemo(() => {
    const groups: Array<{ speakerLabel: string; items: LiveTranscriptSegment[] }> = []

    for (const segment of segments) {
      const label = getSpeakerLabel(segment)
      const lastGroup = groups[groups.length - 1]

      if (!lastGroup || lastGroup.speakerLabel !== label) {
        groups.push({
          speakerLabel: label,
          items: [segment],
        })
        continue
      }

      lastGroup.items.push(segment)
    }

    return groups
  }, [segments])

  const containerClassName =
    appearance === 'embedded'
      ? 'flex w-full flex-col gap-3'
      : 'flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl'

  return (
    <div className={cn(containerClassName, className)}>
      {content ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/15 px-4 py-6 text-sm text-white/70">
          {content}
        </div>
      ) : (
        <div className="attachments-scrollbar max-h-60 space-y-4 overflow-y-auto pr-1">
          {groupedSegments.map((group, groupIndex) => (
            <div key={`${group.items[0]?.id ?? group.speakerLabel}-${groupIndex}`} className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
                {group.speakerLabel}
              </div>
              <div className="space-y-1">
                {group.items.map((segment) => (
                  <div key={segment.id} className={cn('space-y-1', segment.pending && 'opacity-80')}>
                    {splitDisplayLines(segment.text).map((line, lineIndex) => (
                      <p key={`${segment.id}-${lineIndex}`} className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

