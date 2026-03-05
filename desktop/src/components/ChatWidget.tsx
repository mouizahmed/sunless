import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MessageSquare, Plus, X, Trash2, ChevronLeft, ChevronRight, ChevronDown, Send, Square, Loader2, AlertCircle, Database, Pencil, Copy, Check } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import Response from '@/components/ui/shadcn-io/ai/response'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-neutral-300 px-1"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

type ChatWidgetProps = {
  variant?: 'overlay' | 'dashboard'
}

export default function ChatWidget({ variant = 'dashboard' }: ChatWidgetProps) {
  const {
    isOpen,
    toggleOpen,
    conversations,
    activeConversationId,
    selectConversation,
    deleteConversation,
    renameConversation,
    messages,
    isStreaming,
    streamingText,
    thinkingText,
    lastError,
    completedThinking,
    thinkingDuration,
    toolUsage,
    currentTools,
    sendMessage,
    stopStreaming,
  } = useChat()

  const [input, setInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({})
  const [streamingThinkingExpanded, setStreamingThinkingExpanded] = useState(false)
  const [streamingThinkingDuration, setStreamingThinkingDuration] = useState(0)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  void variant

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, activeConversationId])

  // Track streaming thinking duration
  useEffect(() => {
    if (!thinkingText) {
      setStreamingThinkingDuration(0)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      setStreamingThinkingDuration(Math.round((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [!!thinkingText])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    setInput('')
    await sendMessage(trimmed)
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleNewChat = useCallback(() => {
    selectConversation(null)
    setShowSidebar(false)
  }, [selectConversation])

  const startRename = useCallback((convId: string, currentTitle: string) => {
    setRenamingId(convId)
    setRenameValue(currentTitle)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }, [])

  const confirmRename = useCallback(async () => {
    if (!renamingId) return
    const trimmed = renameValue.trim()
    if (trimmed) {
      await renameConversation(renamingId, trimmed)
    }
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, renameConversation])

  const formatThinkingDuration = (seconds: number) => {
    if (seconds <= 0) return 'Thinking...'
    return `Thought for ${seconds}s`
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const capped = Math.min(el.scrollHeight, 120)
    el.style.height = capped + 'px'
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
  }, [input])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="flex w-[400px] flex-col rounded-xl border border-neutral-700/70 bg-[#2a2a2b]/95 text-neutral-100 shadow-2xl backdrop-blur-md"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-neutral-700/70 px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', showSidebar && 'rotate-180')} />
            </Button>
            <span className="flex-1 truncate text-sm font-medium">
              {activeConversationId
                ? conversations.find((c) => c.id === activeConversationId)?.title ?? 'Chat'
                : 'New Chat'}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleNewChat()} title="New chat">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleOpen} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            {showSidebar && (
              <div className="w-[160px] shrink-0 border-r border-neutral-700/70 overflow-y-auto">
                <div className="p-1.5 space-y-0.5">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs cursor-pointer',
                        conv.id === activeConversationId ? 'bg-white/10' : 'hover:bg-white/10',
                      )}
                      onClick={() => {
                        if (renamingId !== conv.id) {
                          selectConversation(conv.id)
                          setShowSidebar(false)
                        }
                      }}
                    >
                      {renamingId === conv.id ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void confirmRename()
                            if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                          }}
                          onBlur={() => void confirmRename()}
                          className="flex-1 min-w-0 rounded bg-neutral-600 px-1 py-0.5 text-xs text-neutral-100 outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 truncate">{conv.title}</span>
                      )}
                      {renamingId !== conv.id && (
                        <>
                          <button
                            type="button"
                            className="hidden group-hover:block shrink-0 text-neutral-400 hover:text-neutral-200"
                            onClick={(e) => { e.stopPropagation(); startRename(conv.id, conv.title) }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="hidden group-hover:block shrink-0 text-neutral-400 hover:text-red-400"
                            onClick={(e) => { e.stopPropagation(); void deleteConversation(conv.id) }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {conversations.length === 0 && (
                    <div className="px-2 py-4 text-xs text-neutral-500 text-center">No conversations</div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex flex-1 min-h-0 min-w-0 flex-col">
              <div className={cn('flex-1 px-3 py-2', messages.length === 0 && !isStreaming ? 'overflow-y-hidden' : 'overflow-y-auto space-y-3')}>
                {messages.length === 0 && !isStreaming && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-xs text-neutral-400">
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      Ask about your notes and meetings
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const hasThinking = msg.role === 'assistant' && completedThinking[msg.id]
                  const hasTools = msg.role === 'assistant' && toolUsage[msg.id]
                  return (
                    <div key={msg.id} className="space-y-1">
                      {/* Thinking block for this message */}
                      {hasThinking && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-md bg-neutral-800/80">
                            <button
                              type="button"
                              onClick={() => setExpandedThinking(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-300"
                            >
                              {expandedThinking[msg.id] ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                              <span>{formatThinkingDuration(thinkingDuration[msg.id] || 0)}</span>
                            </button>
                            {expandedThinking[msg.id] && (
                              <div className="px-3 pb-3 text-xs whitespace-pre-wrap text-neutral-400">
                                {completedThinking[msg.id]}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tool usage for this message */}
                      {hasTools && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-lg px-2 py-1.5 bg-neutral-800/50">
                            {toolUsage[msg.id].map((tool, idx) => {
                              const toolLabel = {
                                'search_notes': 'Searched notes',
                                'get_note': 'Retrieved note',
                                'list_notes': 'Listed notes',
                                'get_note_stats': 'Analyzed notes',
                                'search_transcripts': 'Searched transcripts',
                                'get_transcript': 'Retrieved transcript',
                                'list_folders': 'Listed folders',
                                'get_folder_contents': 'Retrieved folder contents',
                                'get_notes_by_date': 'Found notes by date',
                                'get_recent_notes': 'Retrieved recent notes',
                              }[tool.tool_name] || 'Used tool'

                              return (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <Database className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                  <span className="text-blue-600 dark:text-blue-400">
                                    {toolLabel}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={cn(
                          'flex',
                          msg.role === 'user' ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {msg.role === 'user' ? (
                          <div className="group max-w-[85%]">
                            <div className="rounded-lg px-3 py-2 text-sm bg-neutral-700 text-neutral-100 break-words whitespace-pre-wrap">
                              {msg.content}
                            </div>
                            <div className="flex justify-end">
                              <CopyButton text={msg.content} />
                            </div>
                          </div>
                        ) : (
                          <div className="group relative w-full">
                            <Response className="!text-xs !leading-relaxed !text-neutral-100 px-1">
                              {msg.content}
                            </Response>
                            <CopyButton text={msg.content} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Error message */}
                {lastError && (
                  <div className="flex justify-center">
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{lastError}</span>
                    </div>
                  </div>
                )}

                {/* Streaming response */}
                {isStreaming && (
                  <>
                    {thinkingText && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-md bg-neutral-800/80">
                          <button
                            type="button"
                            onClick={() => setStreamingThinkingExpanded(!streamingThinkingExpanded)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-300"
                          >
                            {streamingThinkingExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                            <span>{formatThinkingDuration(streamingThinkingDuration)}</span>
                          </button>
                          {streamingThinkingExpanded && (
                            <div className="px-3 pb-3 text-xs whitespace-pre-wrap text-neutral-400">
                              {thinkingText}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {currentTools.length > 0 && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-lg px-3 py-2 space-y-1 bg-neutral-800/50">
                          {currentTools.map((tool, idx) => {
                            const toolLabel = {
                              'search_notes': 'Searching notes',
                              'get_note': 'Retrieving note',
                              'list_notes': 'Listing notes',
                              'get_note_stats': 'Analyzing notes',
                              'search_transcripts': 'Searching transcripts',
                              'get_transcript': 'Retrieving transcript',
                              'list_folders': 'Listing folders',
                              'get_folder_contents': 'Retrieving folder contents',
                              'get_notes_by_date': 'Finding notes by date',
                              'get_recent_notes': 'Retrieving recent notes',
                            }[tool.tool_name] || 'Using tool'

                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <Database className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span className="text-blue-600 dark:text-blue-400">
                                  {toolLabel}...
                                </span>
                                {tool.result && (
                                  <span className="text-green-600 dark:text-green-400">✓</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {streamingText && (
                      <div className="flex justify-start">
                        <div className="group relative w-full">
                          <Response className="!text-xs !leading-relaxed !text-neutral-100 px-1">
                            {streamingText}
                          </Response>
                          <CopyButton text={streamingText} />
                        </div>
                      </div>
                    )}
                    {!streamingText && !thinkingText && (
                      <div className="flex justify-start">
                        <div className="rounded-lg px-3 py-2 bg-neutral-800/80">
                          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-neutral-700/70 p-2">
                <div className="flex items-center gap-1.5">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-neutral-700/70 bg-neutral-800/80 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:ring-1 focus:ring-violet-500"
                    disabled={isStreaming}
                  />
                  {isStreaming ? (
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg bg-red-600 text-white hover:bg-red-700"
                      onClick={stopStreaming}
                      title="Stop generating"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                      onClick={() => void handleSend()}
                      disabled={!input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105',
          isOpen
            ? 'bg-neutral-700 text-white'
            : 'bg-violet-600 text-white hover:bg-violet-700',
        )}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </div>
  )
}
