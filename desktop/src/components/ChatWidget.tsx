import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MessageSquare, Plus, X, Trash2, ChevronDown, Square, Loader2, AlertCircle, Database, Pencil, Copy, Check, ArrowUp } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import Response from '@/components/ui/shadcn-io/ai/response'
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
  const [showConvDropdown, setShowConvDropdown] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({})
  const [streamingThinkingExpanded, setStreamingThinkingExpanded] = useState(false)
  const [streamingThinkingDuration, setStreamingThinkingDuration] = useState(0)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  void variant

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, activeConversationId])

  // Minimize on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggleOpen()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, toggleOpen])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showConvDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowConvDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showConvDropdown])

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
    setShowConvDropdown(false)
  }, [selectConversation])

  const startRename = useCallback((convId: string, currentTitle: string) => {
    setRenamingId(convId)
    setRenameValue(currentTitle)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }, [])

  const confirmRename = useCallback(async () => {
    if (!renamingId) return
    const trimmed = renameValue.trim()
    if (trimmed) await renameConversation(renamingId, trimmed)
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

  const activeTitle = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)?.title ?? 'Chat'
    : 'New Chat'

  const toolLabels: Record<string, string> = {
    search_notes: 'Searched notes',
    get_note: 'Retrieved note',
    list_notes: 'Listed notes',
    get_note_stats: 'Analyzed notes',
    search_transcripts: 'Searched transcripts',
    get_transcript: 'Retrieved transcript',
    list_folders: 'Listed folders',
    get_folder_contents: 'Retrieved folder contents',
    get_notes_by_date: 'Found notes by date',
    get_recent_notes: 'Retrieved recent notes',
  }

  const streamingToolLabels: Record<string, string> = {
    search_notes: 'Searching notes',
    get_note: 'Retrieving note',
    list_notes: 'Listing notes',
    get_note_stats: 'Analyzing notes',
    search_transcripts: 'Searching transcripts',
    get_transcript: 'Retrieving transcript',
    list_folders: 'Listing folders',
    get_folder_contents: 'Retrieving folder contents',
    get_notes_by_date: 'Finding notes by date',
    get_recent_notes: 'Retrieving recent notes',
  }

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Single container — collapses to pill when closed */}
      <div
        className="flex w-[400px] flex-col rounded-2xl border border-neutral-700/50 bg-[#2a2a2b]/95 text-neutral-100 shadow-2xl backdrop-blur-md overflow-visible"
        style={isOpen ? { height: 500 } : undefined}
      >
          {isOpen && (<>
          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-neutral-700/50 px-3 py-2.5">
            {/* Title / conversation dropdown trigger */}
            <div ref={dropdownRef} className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setShowConvDropdown(!showConvDropdown)}
                className="flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium hover:bg-white/5 transition-colors max-w-full"
              >
                <span className="truncate max-w-[200px]">{activeTitle}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform', showConvDropdown && 'rotate-180')} />
              </button>

              {/* Conversation dropdown */}
              {showConvDropdown && (
                <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-neutral-700/50 bg-[#2a2a2b]/98 shadow-xl z-10 overflow-hidden">
                  <div className="max-h-52 overflow-y-auto p-1">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      New Chat
                    </button>
                    {conversations.length > 0 && <div className="my-1 border-t border-neutral-700/50" />}
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          'group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs cursor-pointer transition-colors',
                          conv.id === activeConversationId ? 'bg-white/10' : 'hover:bg-white/10',
                        )}
                        onClick={() => {
                          if (renamingId !== conv.id) {
                            selectConversation(conv.id)
                            setShowConvDropdown(false)
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
                          <span className="flex-1 truncate text-neutral-200">{conv.title}</span>
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
                      <div className="px-2 py-3 text-xs text-neutral-500 text-center">No conversations</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-0.5 ml-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleNewChat()}
                title="New chat"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex flex-1 min-h-0 flex-col">
            <div className={cn('flex-1 px-4 py-3', messages.length === 0 && !isStreaming ? 'overflow-y-hidden' : 'overflow-y-auto space-y-4')}>
              {messages.length === 0 && !isStreaming && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-xs text-neutral-500">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    Ask about your notes and meetings
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const hasThinking = msg.role === 'assistant' && completedThinking[msg.id]
                const hasTools = msg.role === 'assistant' && toolUsage[msg.id]
                return (
                  <div key={msg.id} className="space-y-1">
                    {/* Thinking block */}
                    {hasThinking && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-md bg-neutral-800/80">
                          <button
                            type="button"
                            onClick={() => setExpandedThinking(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-400"
                          >
                            <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', !expandedThinking[msg.id] && '-rotate-90')} />
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

                    {/* Tool usage */}
                    {hasTools && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-lg px-2 py-1.5 bg-neutral-800/50">
                          {toolUsage[msg.id].map((tool, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <Database className="h-3 w-3 shrink-0 text-blue-400" />
                              <span className="text-blue-400">{toolLabels[tool.tool_name] ?? 'Used tool'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message content */}
                    <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'user' ? (
                        <div className="group max-w-[85%]">
                          <div className="rounded-2xl px-3 py-2 text-sm bg-neutral-600/60 text-neutral-100 break-words whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          <div className="flex justify-end">
                            <CopyButton text={msg.content} />
                          </div>
                        </div>
                      ) : (
                        <div className="group relative w-full">
                          <Response className="!text-xs !leading-relaxed !text-neutral-100">
                            {msg.content}
                          </Response>
                          <CopyButton text={msg.content} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Error */}
              {lastError && (
                <div className="flex justify-center">
                  <div className="flex items-start gap-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{lastError}</span>
                  </div>
                </div>
              )}

              {/* Streaming */}
              {isStreaming && (
                <>
                  {thinkingText && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-md bg-neutral-800/80">
                        <button
                          type="button"
                          onClick={() => setStreamingThinkingExpanded(!streamingThinkingExpanded)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-neutral-400"
                        >
                          <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', !streamingThinkingExpanded && '-rotate-90')} />
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
                      <div className="max-w-[85%] rounded-lg px-2 py-1.5 space-y-1 bg-neutral-800/50">
                        {currentTools.map((tool, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <Database className="h-3 w-3 shrink-0 text-blue-400" />
                            <span className="text-blue-400">{streamingToolLabels[tool.tool_name] ?? 'Using tool'}...</span>
                            {tool.result && <span className="text-green-400">✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {streamingText && (
                    <div className="flex justify-start">
                      <div className="group relative w-full">
                        <Response className="!text-xs !leading-relaxed !text-neutral-100">
                          {streamingText}
                        </Response>
                        <CopyButton text={streamingText} />
                      </div>
                    </div>
                  )}
                  {!streamingText && !thinkingText && (
                    <div className="flex justify-start">
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                    </div>
                  )}
                </>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
          </>)}

          {/* Pill input — always at bottom of container */}
          {isOpen && <div className="border-t border-neutral-700/50" />}
          <div className="flex items-center gap-2 px-2 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (!isOpen) toggleOpen() }}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none"
              disabled={isStreaming}
            />
            <div className="shrink-0">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  title="Stop generating"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-600 text-white hover:bg-neutral-500 transition-colors"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (!isOpen) toggleOpen(); else void handleSend() }}
                  disabled={isOpen && !input.trim()}
                  title="Send"
                  className={cn('flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-600 text-white hover:bg-neutral-500 disabled:cursor-not-allowed transition-colors', !input.trim() && 'opacity-30')}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
    </div>
  )
}
