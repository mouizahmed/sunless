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

const SPEAKER_LABEL: Record<NonNullable<LiveTranscriptSegment['speaker']> | 'assistant', string> = {
  user: 'You',
  assistant: 'Sunless',
  system: 'System',
}

function formatRelativeTime(timestamp: number) {
  const now = Date.now()
  const diffMs = now - timestamp

  if (diffMs < 5_000) {
    return 'just now'
  }

  const seconds = Math.round(diffMs / 1_000)
  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.round(hours / 24)
  return `${days}d ago`
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

  const containerClassName =
    appearance === 'embedded'
      ? 'flex w-full flex-col gap-3'
      : 'flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl'

  return (
    <div className={cn(containerClassName, className)}>
      {content ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-sm text-white/70">
          {content}
        </div>
      ) : (
        <div className="attachments-scrollbar max-h-60 space-y-3 overflow-y-auto pr-1">
          {segments.map((segment) => {
            const speakerLabel = SPEAKER_LABEL[segment.speaker ?? 'assistant'] ?? 'Sunless'

            return (
              <div
                key={segment.id}
                className={cn(
                  'rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
                  segment.pending && 'opacity-80',
                )}
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-white/60">
                  <span className="uppercase tracking-wide text-white/50">{speakerLabel}</span>
                  <span>{formatRelativeTime(segment.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{segment.text}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

