import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LiveInsight, LiveInsightAction } from '@/types/live-insight'

export type LiveInsightsStatus = 'live' | 'paused' | 'disabled'

type LiveInsightsPanelProps = {
  insights: LiveInsight[]
  status: LiveInsightsStatus
  processing?: boolean
  onOpenInsightInChat?: (insight: LiveInsight) => void
  onSelectAction?: (insight: LiveInsight, action: LiveInsightAction) => void
  maxCollapsedItems?: number
}

const STATUS_CONFIG: Record<
  LiveInsightsStatus,
  {
    headline: string
    description: string
    dotClass: string
    badgeClass: string
    badgeText: string
  }
> = {
  live: {
    headline: 'Live session',
    description: 'Tracking activity in real time.',
    dotClass: 'bg-emerald-400 animate-pulse',
    badgeClass: 'bg-emerald-500/20 text-emerald-100',
    badgeText: 'Live',
  },
  paused: {
    headline: 'Session paused',
    description: 'Live insights will resume when you continue.',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-400/20 text-amber-100',
    badgeText: 'Paused',
  },
  disabled: {
    headline: 'Insights unavailable',
    description: 'Live insights are currently disabled.',
    dotClass: 'bg-white/40',
    badgeClass: 'bg-white/15 text-white/60',
    badgeText: 'Disabled',
  },
}

const SOURCE_LABEL: Record<string, string> = {
  audio: 'Audio',
  unknown: 'Unknown',
}

const CATEGORY_LABEL: Record<string, string> = {
  error: 'Error',
  suggestion: 'Suggestion',
  observation: 'Observation',
  note: 'Note',
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

function InsightBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/20 bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
      {children}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/15 px-4 py-6 text-sm text-white/60">
      I’ll show live insights here as I analyze your activity.
    </div>
  )
}

export default function LiveInsightsPanel({
  insights,
  status,
  processing = false,
  onOpenInsightInChat,
  onSelectAction,
  maxCollapsedItems = 4,
}: LiveInsightsPanelProps) {
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  const primaryInsight = insights[0]
  const history = insights.slice(1)

  const { headline, description, dotClass, badgeClass, badgeText } = STATUS_CONFIG[status]

  const visibleHistory = useMemo(() => {
    if (isHistoryExpanded) {
      return history
    }

    return history.slice(0, maxCollapsedItems)
  }, [history, isHistoryExpanded, maxCollapsedItems])

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={cn('mt-1 inline-block size-2.5 rounded-full', dotClass)} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{headline}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', badgeClass)}>
                {badgeText}
              </span>
            </div>
            <p className="text-xs text-white/60">{description}</p>
          </div>
        </div>

        {processing && status === 'live' ? (
          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/20 px-2.5 py-1 text-[11px] text-white/70">
            <Loader2 className="size-3 animate-spin text-white/80" />
            <span>Processing…</span>
          </div>
        ) : null}
      </div>

      {!primaryInsight ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/15 bg-white/15 p-4 text-sm text-white shadow-[0_4px_18px_rgba(0,0,0,0.4)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">Latest insight</p>
                <h3 className="mt-1 text-base font-semibold text-white">{primaryInsight.title}</h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-wrap items-center gap-1">
                  {primaryInsight.source ? (
                    <InsightBadge>{SOURCE_LABEL[primaryInsight.source] ?? primaryInsight.source}</InsightBadge>
                  ) : null}
                  {primaryInsight.category ? (
                    <InsightBadge>{CATEGORY_LABEL[primaryInsight.category] ?? primaryInsight.category}</InsightBadge>
                  ) : null}
                </div>
                <span className="text-[11px] font-medium text-white/60">
                  {formatRelativeTime(primaryInsight.createdAt)}
                </span>
              </div>
            </div>

            {primaryInsight.summaryPoints && primaryInsight.summaryPoints.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm text-white/80">
                {primaryInsight.summary ? (
                  <p className="text-sm leading-relaxed text-white/80">{primaryInsight.summary}</p>
                ) : null}
                <ul className="space-y-1.5">
                  {primaryInsight.summaryPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block size-1.5 rounded-full bg-white/150" aria-hidden />
                      <span className="text-sm text-white/80">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-white/80">{primaryInsight.summary}</p>
            )}

            {primaryInsight.details ? (
              <div className="mt-3">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-white/70 transition hover:text-white"
                  onClick={() =>
                    setExpandedInsightId((prev) =>
                      prev === primaryInsight.id ? null : primaryInsight.id,
                    )
                  }
                >
                  {expandedInsightId === primaryInsight.id ? (
                    <>
                      <ChevronUp className="size-3.5" />
                      Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3.5" />
                      View details
                    </>
                  )}
                </button>
                {expandedInsightId === primaryInsight.id ? (
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/15 px-3 py-2 text-xs text-white/65">
                    {primaryInsight.details}
                  </div>
                ) : null}
              </div>
            ) : null}

            {primaryInsight.actions && primaryInsight.actions.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-white/50">Suggested actions</p>
                <div className="mt-2 flex flex-col gap-2">
                  {primaryInsight.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onSelectAction?.(primaryInsight, action)}
                      className="flex w-full items-start gap-2 rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/25 hover:bg-white/20 hover:text-white"
                    >
                      <span className="mt-1 inline-flex size-1.5 rounded-full bg-emerald-400" aria-hidden />
                      <span className="flex-1">
                        <span className="block font-medium text-white">{action.label}</span>
                        {action.description ? (
                          <span className="mt-0.5 block text-xs text-white/70">{action.description}</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {onOpenInsightInChat ? (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 rounded-full border border-white/10 bg-white/15 px-3 text-xs text-white/70 transition hover:border-white/25 hover:bg-white/20 hover:text-white"
                  onClick={() => onOpenInsightInChat(primaryInsight)}
                >
                  <MessageSquare className="size-3.5" />
                  Open in Chat
                </Button>
              </div>
            ) : null}
          </div>

          {history.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Recent insights</span>
                {history.length > maxCollapsedItems ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-white/70 transition hover:text-white"
                    onClick={() => setIsHistoryExpanded((prev) => !prev)}
                  >
                    {isHistoryExpanded ? (
                      <>
                        <ChevronUp className="size-3.5" />
                        View less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" />
                        View all insights
                      </>
                    )}
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
                {visibleHistory.map((insight) => {
                  const isExpanded = expandedInsightId === insight.id

                  return (
                    <div
                      key={insight.id}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 transition hover:border-white/15 hover:bg-white/[0.08]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium text-white">{insight.title}</p>
                          {insight.summaryPoints && insight.summaryPoints.length > 0 ? (
                            <ul className="space-y-0.5 text-xs text-white/65">
                              {insight.summaryPoints.slice(0, 3).map((point) => (
                                <li key={point} className="flex items-start gap-1.5">
                                  <span className="mt-1 inline-block size-1 rounded-full bg-white/35" aria-hidden />
                                  <span className="flex-1">{point}</span>
                                </li>
                              ))}
                              {insight.summaryPoints.length > 3 ? (
                                <li className="text-[11px] uppercase tracking-wide text-white/40">More…</li>
                              ) : null}
                            </ul>
                          ) : (
                            <p className="line-clamp-2 text-xs text-white/70">{insight.summary}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-white/40">
                            {formatRelativeTime(insight.createdAt)}
                          </span>
                          {onOpenInsightInChat ? (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-[10px] font-medium text-white/60 transition hover:text-white"
                              onClick={() => onOpenInsightInChat(insight)}
                            >
                              <MessageSquare className="size-3" />
                              Open
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {insight.details ? (
                        <div className="mt-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-medium text-white/60 transition hover:text-white"
                            onClick={() =>
                              setExpandedInsightId((prev) => (prev === insight.id ? null : insight.id))
                            }
                          >
                            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            {isExpanded ? 'Hide details' : 'View details'}
                          </button>
                          {isExpanded ? (
                            <div className="mt-2 rounded-lg border border-white/10 bg-white/15 px-3 py-2 text-[11px] text-white/65">
                              {insight.details}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

