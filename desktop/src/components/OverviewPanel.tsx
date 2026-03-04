import { useCallback, useState } from 'react'
import { Check, ClipboardCopy, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { OverviewData } from '@/types/note'

type OverviewPanelProps = {
  overview: OverviewData | null
  loading: boolean
  hasContent: boolean
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  if (!text) return null

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </h3>
        <Button
          type="button"
          variant="ghost"
          className="h-6 gap-1 px-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        {text}
      </div>
    </div>
  )
}

function SkeletonBlock() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="h-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
    </div>
  )
}

export default function OverviewPanel({ overview, loading, hasContent }: OverviewPanelProps) {
  if (!hasContent) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Add notes to generate an overview
        </p>
      </div>
    )
  }

  if (loading && !overview) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating overview...
        </div>
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Overview will appear here after your notes are saved
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sidebar-scrollbar">
      <div className="space-y-5">
        {/* Loading indicator for regeneration */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating overview...
          </div>
        )}

        {/* Summary */}
        {overview.summary && (
          <div>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Summary
            </h3>
            <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
              {overview.summary}
            </p>
          </div>
        )}

        {/* Action Items */}
        {overview.action_items && overview.action_items.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Action Items
            </h3>
            <ul className="space-y-1">
              {overview.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                  <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border border-neutral-300 dark:border-neutral-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Email Draft */}
        <CopyBlock label="Email Draft" text={overview.email_draft} />

        {/* Message Draft */}
        <CopyBlock label="Message Draft" text={overview.message_draft} />
      </div>
    </div>
  )
}
