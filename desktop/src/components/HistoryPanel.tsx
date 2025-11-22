import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { CornerDownLeft, Loader2, RefreshCw } from 'lucide-react'

import PanelBar from '@/components/PanelBar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export type HistorySession = {
  id: string
  startedAt: number
  updatedAt: number
  lastMessageAt?: number
  lastMessagePreview?: string
  lastMessageSender?: 'user' | 'assistant'
  messageCount: number
  chatModelProvider?: string
  chatModelName?: string
}

type HistoryPanelProps = {
  onClose: () => void
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  sessions: HistorySession[]
  isLoadingSessions: boolean
  sessionsError?: string | null
  onRetrySessions: () => void
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onRefreshSessions: () => void
  isSelectingSession: boolean
  selectionError?: string | null
  pageIndex: number
  pageSize: number
  totalSessions: number
  onPageChange: (pageIndex: number) => void
}

function formatRelativeTime(value?: number) {
  if (!value) {
    return 'No activity yet'
  }

  const now = Date.now()
  const diff = now - value

  if (diff < 60_000) {
    return 'Just now'
  }

  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.round(hours / 24)
  if (days === 1) {
    return '1 day ago'
  }

  return `${days} days ago`
}

export default function HistoryPanel({
  onClose,
  onMouseDown,
  sessions,
  isLoadingSessions,
  sessionsError,
  onRetrySessions,
  selectedSessionId,
  onSelectSession,
  onRefreshSessions,
  isSelectingSession,
  selectionError,
  pageIndex,
  pageSize,
  totalSessions,
  onPageChange,
}: HistoryPanelProps) {
  const showSessionListEmptyState = !isLoadingSessions && !sessionsError && sessions.length === 0
  const currentPage = pageIndex + 1
  const totalPages = totalSessions > 0 ? Math.ceil(totalSessions / pageSize) : 1
  const paginationTextColor = 'rgba(255, 255, 255, 0.68)'
  const paginationActiveColor = 'rgba(255, 255, 255, 0.95)'

  return (
    <div className="flex w-full flex-col gap-1.5">
      <PanelBar
        onMouseDown={onMouseDown}
        title="History"
        endAdornment={
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-md bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
              onClick={onRefreshSessions}
              title="Refresh history"
              aria-label="Refresh history"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-md bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
              onClick={onClose}
              title="Return to chat"
              aria-label="Return to chat"
            >
              <CornerDownLeft className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-1.5">
        <div className="attachments-scrollbar max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-white/60 pb-1">
            <span>Sessions</span>
            <div className="flex items-center gap-2">
              {isSelectingSession ? (
                <span className="flex items-center gap-1 text-[11px] text-white/60">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </span>
              ) : null}
              {totalSessions > 0 ? (
                <span className="text-[11px] text-white/50">
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </span>
              ) : null}
            </div>
          </div>

          {selectionError ? (
            <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
              {selectionError}
            </div>
          ) : null}

          {isLoadingSessions ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-xs text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading history…</span>
            </div>
          ) : sessionsError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-xs text-red-200">
              <span>Unable to load history.</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-100 transition hover:border-red-400/40 hover:bg-red-500/20"
                onClick={onRetrySessions}
              >
                Try again
              </Button>
            </div>
          ) : showSessionListEmptyState ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-6 text-center text-xs text-white/70">
              <span>No sessions yet.</span>
              <span className="mt-1 block text-[11px] text-white/50">
                Start a new chat to see it appear here.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const isActive = session.id === selectedSessionId
                const lastActivity = formatRelativeTime(session.lastMessageAt ?? session.updatedAt)
                const preview = session.lastMessagePreview?.trim() || 'No response captured yet.'
                const messageCountLabel =
                  session.messageCount === 1 ? '1 message' : `${session.messageCount} messages`

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    disabled={isSelectingSession}
                    className={cn(
                      'flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-70',
                      isActive
                        ? 'border-white/40 bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
                        : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <div className="flex w-full items-center justify-between text-[11px] uppercase tracking-wide">
                      <span className="text-white/60">{lastActivity}</span>
                      <span className="text-white/40">{messageCountLabel}</span>
                    </div>
                    <p className={cn('line-clamp-3 text-sm leading-snug', isActive ? 'text-white' : 'text-white/80')}>
                      {preview}
                    </p>
                    {session.chatModelName ? (
                      <span className="text-[10px] uppercase tracking-wide text-white/35">
                        {session.chatModelProvider ? `${session.chatModelProvider} • ` : ''}
                        {session.chatModelName}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {totalSessions > pageSize ? (
        <Pagination className="mt-1 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (pageIndex > 0) {
                    onPageChange(pageIndex - 1)
                  }
                }}
                className={cn(
                  'h-8 rounded-full border border-white/10 bg-white/5 px-2 text-[11px] text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white',
                  pageIndex === 0 && 'pointer-events-none opacity-50',
                )}
                style={{ color: paginationTextColor }}
              />
            </PaginationItem>

            {(() => {
              const items: ReactNode[] = []
              const addPage = (pageNumber: number) => {
                items.push(
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      size="default"
                      isActive={pageNumber === currentPage}
                      className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-[11px] text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white data-[active=true]:border-white/25 data-[active=true]:bg-white/15 data-[active=true]:text-white"
                      style={{ color: pageNumber === currentPage ? paginationActiveColor : paginationTextColor }}
                      onClick={(event) => {
                        event.preventDefault()
                        onPageChange(pageNumber - 1)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>,
                )
              }

              const addEllipsis = (key: string) => {
                items.push(
                  <PaginationItem key={`ellipsis-${key}`}>
                    <PaginationEllipsis
                      className="h-8 min-w-[32px] rounded-full border border-white/10 bg-white/5 px-3 text-[11px]"
                      style={{ color: paginationTextColor }}
                    />
                  </PaginationItem>,
                )
              }

              if (totalPages <= 5) {
                for (let page = 1; page <= totalPages; page += 1) {
                  addPage(page)
                }
              } else {
                addPage(1)

                if (currentPage > 3) {
                  addEllipsis('start')
                }

                const startPage = Math.max(2, currentPage - 1)
                const endPage = Math.min(totalPages - 1, currentPage + 1)

                for (let page = startPage; page <= endPage; page += 1) {
                  addPage(page)
                }

                if (currentPage < totalPages - 2) {
                  addEllipsis('end')
                }

                addPage(totalPages)
              }

              return items
            })()}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (pageIndex + 1 < totalPages) {
                    onPageChange(pageIndex + 1)
                  }
                }}
                className={cn(
                  'h-8 rounded-full border border-white/10 bg-white/5 px-2 text-[11px] text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white',
                  pageIndex + 1 >= totalPages && 'pointer-events-none opacity-50',
                )}
                style={{ color: paginationTextColor }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}

