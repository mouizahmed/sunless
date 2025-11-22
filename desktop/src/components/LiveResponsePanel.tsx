import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LiveResponseSuggestion } from '@/types/live-insight'

type LiveResponsePanelProps = {
  suggestion: LiveResponseSuggestion
  onUseSuggestion: (prompt: string) => void
  onClear: () => void
  className?: string
}

export default function LiveResponsePanel({
  suggestion,
  onUseSuggestion,
  onClear,
  className,
}: LiveResponsePanelProps) {
  const { title = 'Suggested response', description, prompts } = suggestion

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/15 px-4 py-3 text-sm text-white backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-white/50">Response Idea</span>
            <span className="rounded-full border border-white/15 bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
              Live
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
          {description ? <p className="mt-1 text-xs text-white/65">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/20 text-white/60 transition hover:border-white/25 hover:bg-white/15 hover:text-white"
          aria-label="Clear suggested response"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="ghost"
            className="w-full justify-start rounded-xl border border-white/10 bg-white/15 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/25 hover:bg-white/20 hover:text-white"
            onClick={() => onUseSuggestion(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}

