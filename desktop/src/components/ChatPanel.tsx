import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Message, MessageContent } from '@/components/ui/shadcn-io/ai/message'
import { Response as AIResponse } from '@/components/ui/shadcn-io/ai/response'
import { cn } from '@/lib/utils'

export type ChatAuthor = 'user' | 'assistant'

export type ChatMessageAttachment = {
  id?: string
  clientId?: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  url?: string
  dataUrl?: string
  source?: string
}

export type ChatMessage = {
  id: string
  remoteId?: string
  author: ChatAuthor
  content: string
  channel?: 'chat' | 'live'
  createdAt: number
  pending?: boolean
  attachments?: ChatMessageAttachment[]
  searching?: boolean
}

export type ChatStatus = 'default' | 'live' | 'paused'

type ChatPanelProps = {
  messages: ChatMessage[]
  onSend: (content: string) => void | Promise<void>
  status?: ChatStatus
  quickReplies?: string[]
  isSending?: boolean
  onStartNewSession?: () => void
}

function formatTimestamp(date: number, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(date))
}

function ChatPanel({
  messages,
  onSend,
  status = 'default',
  quickReplies,
  isSending = false,
  onStartNewSession,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  )

  useEffect(() => {
    const container = messagesRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [messages])

  const defaultLiveQuickReplies = ['What should I say?', 'Follow-up questions', 'Fact-check', 'Recap']

  const computedQuickReplies =
    status === 'live'
      ? quickReplies && quickReplies.length > 0
        ? quickReplies
        : defaultLiveQuickReplies
      : []

  const sendDraft = () => {
    const value = draft.trim()
    if (!value) {
      return
    }

    void onSend(value)
    setDraft('')
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendDraft()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      sendDraft()
    }
  }

  const handleQuickReply = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    void onSend(trimmed)
  }

  const handleStartNewSessionClick = () => {
    onStartNewSession?.()
  }

  const handleStartNewSessionKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!onStartNewSession) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onStartNewSession()
    }
  }

  const canSend = draft.trim().length > 0 && !isSending

  const renderMessageAttachments = (message: ChatMessage, isAssistant: boolean) => {
    if (message.searching) {
      return null
    }

    if (!message.attachments || message.attachments.length === 0) {
      return null
    }

    return (
      <div
        className={cn(
          'flex flex-wrap gap-2',
          isAssistant ? 'justify-start' : 'justify-end',
        )}
      >
        {message.attachments.map((attachment) => {
          const isImage = attachment.mimeType?.startsWith('image/') ?? false
          const previewSrc = attachment.dataUrl ?? attachment.url
          const sizeLabel =
            typeof attachment.sizeBytes === 'number'
              ? formatFileSize(attachment.sizeBytes)
              : undefined

          if (isImage && previewSrc) {
            return (
              <div
                key={attachment.clientId ?? attachment.id ?? previewSrc}
                className="overflow-hidden rounded-xl border border-white/15 bg-black/60"
              >
                <img
                  src={previewSrc}
                  alt={attachment.fileName}
                  className="h-24 w-24 object-cover"
                />
              </div>
            )
          }

          const handleOpen = () => {
            if (attachment.url) {
              window.open(attachment.url, '_blank', 'noopener,noreferrer')
            }
          }

          return (
            <button
              key={attachment.clientId ?? attachment.id ?? attachment.fileName}
              type="button"
              onClick={handleOpen}
              className="flex w-full items-start gap-3 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-left text-xs text-white/80 transition hover:border-white/30 hover:bg-black/80"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 space-y-0.5">
                <span className="block break-words text-sm font-medium text-white">
                  {attachment.fileName}
                </span>
                <span className="block break-words text-[11px] text-white/60">
                  {attachment.mimeType}
                  {sizeLabel ? ` · ${sizeLabel}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 pb-4 pt-3 backdrop-blur-xl">
        <div
          ref={messagesRef}
          className="attachments-scrollbar max-h-60 space-y-1 overflow-y-auto pr-1"
        >
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/15 px-4 py-6 text-sm text-white/70">
              No messages yet — kick things off with a quick question or let Sunless know what to keep an eye on.
            </div>
          ) : (
            messages.map((message) => {
              const isAssistant = message.author === 'assistant'
              if (message.searching) {
                return (
                  <Message key={message.id} from={isAssistant ? 'assistant' : 'user'} className="w-full">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/15 px-3 py-2 text-xs text-white/70">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Searching the web…</span>
                    </div>
                  </Message>
                )
              }
              const hasContent = message.content.trim().length > 0
              return (
                <Message
                  key={message.id}
                  from={isAssistant ? 'assistant' : 'user'}
                  className="w-full"
                >
                  <div
                    className={cn(
                      'flex w-full flex-col gap-2',
                      isAssistant ? 'items-start' : 'items-end',
                    )}
                  >
                    {renderMessageAttachments(message, isAssistant)}
                    {isAssistant && !message.content ? (
                      <span className="flex items-center gap-1">
                        <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-white/60" />
                        <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.15s]" />
                        <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:0.3s]" />
                      </span>
                    ) : hasContent ? (
                      <MessageContent
                        className={cn(
                          'border border-white/10 bg-white/15 text-sm leading-relaxed text-white shadow-[0_4px_12px_rgba(0,0,0,0.35)]',
                          'group-[.is-user]:bg-white group-[.is-user]:text-black',
                          message.pending && 'opacity-90',
                        )}
                      >
                        {isAssistant ? (
                          <AIResponse>
                            {message.content}
                          </AIResponse>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                        )}
                        <div
                          className={cn(
                            'mt-2 flex items-center justify-end gap-2 text-[11px]',
                            isAssistant ? 'text-white/50' : 'text-black/60',
                          )}
                        >
                          {message.pending && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>{formatTimestamp(message.createdAt, timeFormatter)}</span>
                        </div>
                      </MessageContent>
                    ) : (
                      <div
                        className={cn(
                          'flex items-center justify-end text-[11px]',
                          isAssistant ? 'text-white/50' : 'text-black/60',
                        )}
                      >
                        <span>{formatTimestamp(message.createdAt, timeFormatter)}</span>
                      </div>
                    )}
                  </div>
                </Message>
              )
            })
          )}
        </div>

        {status === 'live' && computedQuickReplies.length > 0 && (
          <div className="grid grid-cols-4 gap-1">
            {computedQuickReplies.map((reply) => (
              <Button
                key={reply}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleQuickReply(reply)}
                className="h-8 justify-center rounded-full border border-white/15 bg-white/15 px-2 text-white/70 shadow-none transition hover:border-white/30 hover:bg-white/20 hover:text-white whitespace-nowrap overflow-hidden !text-xs leading-tight"
              >
                {reply}
              </Button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/15 p-3">
          <div className="flex items-center gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask for a recap, highlight, or next step…"
              className="max-h-24 min-h-[32px] flex-1 resize-none rounded-md border border-white/15 bg-white/15 px-3 py-1.5 text-sm leading-tight text-white placeholder:text-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/25"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              disabled={!canSend}
              className="h-8 w-8 shrink-0 rounded-md bg-white/20 p-0 text-white transition hover:bg-white/20 hover:text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
        {onStartNewSession ? (
          <div className="-mt-1 flex justify-start">
            <span
              role="button"
              tabIndex={0}
              onClick={handleStartNewSessionClick}
              onKeyDown={handleStartNewSessionKeyDown}
              className="cursor-pointer text-[11px] font-medium text-white/60 underline decoration-white/20 underline-offset-2 transition hover:text-white hover:decoration-white/60 focus:outline-none focus-visible:text-white"
            >
              Start new session
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ChatPanel


function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  const kb = size / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}


