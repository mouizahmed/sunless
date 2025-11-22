import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AttachmentsBar, { type Attachment } from '@/components/AttachmentsBar'
import ChatPanel, { type ChatMessage, type ChatMessageAttachment } from '@/components/ChatPanel'
import HistoryPanel, { type HistorySession } from '@/components/HistoryPanel'
import LiveInsightsPanel from '@/components/LiveInsightsPanel'
import LiveResponsePanel from '@/components/LiveResponsePanel'
import MainBar from '@/components/MainBar'
import SettingsPanel from '@/components/SettingsPanel'
import Welcome from '@/components/Welcome'
import './App.css'
import type { LiveInsight, LiveInsightAction, LiveResponseSuggestion } from '@/types/live-insight'
import { auth } from '@/config/firebase'

const WINDOW_VERTICAL_PADDING = 16
const MAX_APP_HEIGHT = 1000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

type ApiChatMessage = {
  id: string
  session_id: string
  channel: 'chat' | 'live'
  sender: 'user' | 'assistant'
  content: string
  created_at: string
}

type ChatApiResponse = {
  session_id: string
  messages: ApiChatMessage[]
  assistant_message?: ApiChatMessage
}

type SSEPayload = {
  type?: string
  session_id?: string
  client_message_id?: string
  content?: string
  error?: string
  details?: string
  message?: {
    id?: string
    session_id?: string
    channel?: 'chat' | 'live'
    sender?: 'user' | 'assistant'
    content?: string
    created_at?: string
    attachments?: Array<{
      id?: string
      client_id?: string
      file_name?: string
      mime_type?: string
      size_bytes?: number
      public_url?: string
      source?: string
    }>
  }
}

const parseSSEEvent = (chunk: string): SSEPayload | null => {
  const dataLines = chunk
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())

  if (dataLines.length === 0) {
    return null
  }

  const payload = dataLines.join('\n')
  if (!payload) {
    return null
  }

  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

const calculateDataUrlSize = (dataUrl?: string) => {
  if (!dataUrl) {
    return 0
  }

  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex === -1) {
    return 0
  }

  const base64 = dataUrl.slice(commaIndex + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const size = (base64.length * 3) / 4 - padding
  return size > 0 ? Math.round(size) : 0
}

const deriveAttachmentName = (attachment: Attachment) => {
  if (attachment.name && attachment.name.trim().length > 0) {
    return attachment.name
  }

  if (attachment.source === 'screenshot') {
    return `Screenshot-${attachment.id.slice(0, 6)}.png`
  }

  return `Attachment-${attachment.id.slice(0, 6)}`
}

const parseTimestamp = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return fallback
}

type HistorySessionApi = {
  id?: string | number
  started_at?: string
  updated_at?: string
  last_message_at?: string
  last_message_preview?: string
  last_message_sender?: string
  message_count?: number
  chat_model_provider?: string
  chat_model_name?: string
}

type HistoryAttachmentApi = {
  id?: string | number
  file_name?: string
  mime_type?: string
  size_bytes?: number
  public_url?: string
  source?: string
}

type HistoryMessageApi = {
  id?: string | number
  session_id?: string
  channel?: string
  sender?: string
  content?: string
  created_at?: string
  attachments?: HistoryAttachmentApi[]
}

type HistorySessionsApiResponse = {
  sessions?: unknown
  pagination?: {
    total?: number
    limit?: number
    offset?: number
    has_more?: boolean
  }
}

const createInitialChatMessages = (): ChatMessage[] => {
  const now = Date.now()
  const seedId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${now}-assistant`

  return [
    {
      id: seedId,
      author: 'assistant',
      content: 'Hi! I’m here to help you capture takeaways and next steps as you work.',
      channel: 'chat',
      createdAt: now,
    },
  ]
}

const HISTORY_SESSIONS_PAGE_SIZE = 20

const PREVIEW_RESPONSE_SUGGESTION: LiveResponseSuggestion = {
  id: 'preview-response',
  title: 'Try this follow-up',
  description: 'Auto-suggested prompts appear here during a live session.',
  prompts: [
    'Can you walk me through what happened after that?',
    'What do you think caused the issue?',
    'Is there anything you would do differently next time?',
  ],
  createdAt: Date.now(),
}

function AppContent() {
  const { user, isLoading, logout, logoutEverywhere } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(createInitialChatMessages)
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null)
  const [activePanel, setActivePanel] = useState<'main' | 'settings' | 'history'>('main')
  const [interactionMode, setInteractionMode] = useState<'default' | 'live' | 'paused'>('default')
  const [isFullScreenshotCapturing, setIsFullScreenshotCapturing] = useState(false)
  const [liveInsights, setLiveInsights] = useState<LiveInsight[]>([])
  const [isLiveInsightsEnabled, setIsLiveInsightsEnabled] = useState(true)
  const [isInsightProcessing, setIsInsightProcessing] = useState(false)
  const [liveResponseSuggestion, setLiveResponseSuggestion] = useState<LiveResponseSuggestion | null>(null)
  const [showResponsePreview, setShowResponsePreview] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isChatSending, setIsChatSending] = useState(false)
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null)
  const [historySessionsTotal, setHistorySessionsTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [isHistorySelectionLoading, setIsHistorySelectionLoading] = useState(false)
  const [historySelectionError, setHistorySelectionError] = useState<string | null>(null)
  const [historySessionsReloadKey, setHistorySessionsReloadKey] = useState(0)
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    setContentEl(node)
  }, [])

  const createAttachment = useCallback((init: Omit<Attachment, 'id'>): Attachment => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    return {
      id,
      ...init,
    }
  }, [])

  useEffect(() => {
    window.windowControl?.onDragOffset((offset) => {
      setDragOffset(offset)
    })
  }, [])

  useEffect(() => {
    if (!window.screenshot?.onResult) return

    const unsubscribe = window.screenshot.onResult(({ dataUrl }) => {
      setAttachments((prev) => [
        ...prev,
        createAttachment({
          kind: 'image',
          dataUrl,
          mimeType: 'image/png',
          source: 'screenshot',
        }),
      ])
    })

    return () => {
      unsubscribe?.()
    }
  }, [createAttachment])

  useEffect(() => {
    const screenshotApi = window.screenshot
    if (!screenshotApi) return

    const unsubscribeStart = screenshotApi.onFullScreenshotStart?.(() => {
      setIsFullScreenshotCapturing(true)
    })

    const unsubscribeComplete = screenshotApi.onFullScreenshotComplete?.(() => {
      setIsFullScreenshotCapturing(false)
    })

    return () => {
      unsubscribeStart?.()
      unsubscribeComplete?.()
    }
  }, [])

  useEffect(() => {
    const liveInsightsApi = window.liveInsights
    if (!liveInsightsApi) {
      return
    }

    const unsubscribeInsight = liveInsightsApi.onInsight?.(({ insight }) => {
      if (!insight) {
        return
      }

      setLiveInsights((prev) => {
        const exists = prev.some((item) => item.id === insight.id)
        const merged = exists
          ? prev.map((item) => (item.id === insight.id ? { ...item, ...insight } : item))
          : [insight, ...prev]

        return merged.sort((a, b) => b.createdAt - a.createdAt)
      })
    })

    const unsubscribeProcessing = liveInsightsApi.onProcessing?.((value) => {
      setIsInsightProcessing(Boolean(value))
    })

    const unsubscribeResponse = liveInsightsApi.onResponseSuggestion?.(({ suggestion }) => {
      if (!suggestion) {
        return
      }

      setLiveResponseSuggestion(suggestion)
      setShowResponsePreview(false)
    })

    const unsubscribeResponseClear = liveInsightsApi.onResponseClear?.(() => {
      setLiveResponseSuggestion(null)
    })

    const unsubscribeReset = liveInsightsApi.onReset?.(() => {
      setLiveInsights([])
      setLiveResponseSuggestion(null)
      setShowResponsePreview(true)
    })

    const unsubscribeEnabled = liveInsightsApi.onEnabledChange?.((enabled) => {
      const value = Boolean(enabled)
      setIsLiveInsightsEnabled(value)
      if (!value) {
        setIsInsightProcessing(false)
        setLiveResponseSuggestion(null)
        setShowResponsePreview(true)
      }
    })

    if (typeof liveInsightsApi.isEnabled === 'function') {
      Promise.resolve(liveInsightsApi.isEnabled()).then((enabled) => {
        if (typeof enabled === 'boolean') {
          setIsLiveInsightsEnabled(enabled)
          if (!enabled) {
            setLiveResponseSuggestion(null)
            setShowResponsePreview(true)
          }
        }
      })
    }

    return () => {
      unsubscribeInsight?.()
      unsubscribeProcessing?.()
      unsubscribeResponse?.()
      unsubscribeResponseClear?.()
      unsubscribeReset?.()
      unsubscribeEnabled?.()
    }
  }, [])

  useLayoutEffect(() => {
    if (!contentEl) return

    const updateHeight = () => {
      const contentHeight = Math.min(contentEl.scrollHeight, MAX_APP_HEIGHT)
      const height = contentHeight + WINDOW_VERTICAL_PADDING
      window.windowControl?.setWindowHeight?.(height)
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      updateHeight()
    })

    observer.observe(contentEl)

    return () => {
      observer.disconnect()
    }
  }, [contentEl])

  useEffect(() => {
    if (user) {
      setActivePanel('main')
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setInteractionMode('default')
    }
  }, [user])

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isDragging) return
      window.windowControl?.moveDrag(event.screenX, event.screenY, dragOffset.x, dragOffset.y)
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragOffset])

  const fetchHistorySessions = useCallback(async (page: number): Promise<{ sessions: HistorySession[]; total: number }> => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    const idToken = await currentUser.getIdToken()
    const limit = HISTORY_SESSIONS_PAGE_SIZE
    const offset = page * limit
    const url = new URL(`${API_BASE_URL}/chat/sessions`)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    })

    if (!response.ok) {
      let message = 'Failed to load history'
      try {
        const errorPayload = await response.json()
        if (typeof errorPayload?.details === 'string' && errorPayload.details.trim()) {
          message = errorPayload.details.trim()
        } else if (typeof errorPayload?.error === 'string' && errorPayload.error.trim()) {
          message = errorPayload.error.trim()
        }
      } catch {
        // Ignore JSON parse errors and fall back to default message.
      }

      throw new Error(message)
    }

    const payload = (await response.json()) as HistorySessionsApiResponse
    const rawSessions: HistorySessionApi[] = Array.isArray(payload.sessions)
      ? (payload.sessions as HistorySessionApi[])
      : []
    const totalSessions =
      typeof payload.pagination?.total === 'number'
        ? payload.pagination.total
        : offset + rawSessions.length
    const now = Date.now()

    const sessions: HistorySession[] = []

    for (const item of rawSessions) {
      const idValue = item?.id
      const id =
        typeof idValue === 'string'
          ? idValue
          : typeof idValue === 'number'
            ? String(idValue)
            : ''
      if (!id) {
        continue
      }

      const startedAt = parseTimestamp(item?.started_at, now)
      const updatedAt = parseTimestamp(item?.updated_at, startedAt)
      const lastMessageAtValue =
        item?.last_message_at !== undefined
          ? parseTimestamp(item.last_message_at, updatedAt)
          : undefined
      const lastMessagePreviewValue =
        typeof item?.last_message_preview === 'string' ? item.last_message_preview : undefined
      const lastMessageSenderValue =
        item?.last_message_sender === 'assistant' || item?.last_message_sender === 'user'
          ? (item.last_message_sender as 'assistant' | 'user')
          : undefined

      const session: HistorySession = {
        id,
        startedAt,
        updatedAt,
        messageCount: typeof item?.message_count === 'number' ? item.message_count : 0,
      }

      if (typeof item?.chat_model_provider === 'string' && item.chat_model_provider.trim()) {
        session.chatModelProvider = item.chat_model_provider
      }

      if (typeof item?.chat_model_name === 'string' && item.chat_model_name.trim()) {
        session.chatModelName = item.chat_model_name
      }

      if (lastMessageAtValue !== undefined) {
        session.lastMessageAt = lastMessageAtValue
      }

      if (lastMessagePreviewValue && lastMessagePreviewValue.trim().length > 0) {
        session.lastMessagePreview = lastMessagePreviewValue
      }

      if (lastMessageSenderValue) {
        session.lastMessageSender = lastMessageSenderValue
      }

      sessions.push(session)
    }

    return { sessions, total: totalSessions }
  }, [])

  const fetchHistoryMessages = useCallback(
    async (sessionId: string): Promise<ChatMessage[]> => {
      if (!sessionId) {
        return []
      }

      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Not authenticated')
      }

      const idToken = await currentUser.getIdToken()
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        let message = 'Failed to load messages'
        try {
          const errorPayload = await response.json()
          if (typeof errorPayload?.details === 'string' && errorPayload.details.trim()) {
            message = errorPayload.details.trim()
          } else if (typeof errorPayload?.error === 'string' && errorPayload.error.trim()) {
            message = errorPayload.error.trim()
          }
        } catch {
          // Ignore JSON parse errors.
        }

        throw new Error(message)
      }

      const payload = (await response.json()) as { messages?: unknown }
      const messagesData: HistoryMessageApi[] = Array.isArray(payload.messages)
        ? (payload.messages as HistoryMessageApi[])
        : []

      return messagesData.map((item) => {
        const createdAt = parseTimestamp(item?.created_at, Date.now())
        const rawAttachments = item.attachments ?? []
        const sender =
          item?.sender === 'assistant' || item?.sender === 'user' ? item.sender : 'assistant'

        const channel: 'chat' | 'live' = item?.channel === 'live' ? 'live' : 'chat'

        const attachments: ChatMessageAttachment[] = rawAttachments
          .map((attachment) => {
            const attachmentIdValue = attachment?.id
            const attachmentId =
              typeof attachmentIdValue === 'string'
                ? attachmentIdValue
                : typeof attachmentIdValue === 'number'
                  ? String(attachmentIdValue)
                  : undefined
            const fileName =
              typeof attachment?.file_name === 'string' && attachment.file_name.trim().length > 0
                ? attachment.file_name
                : 'Attachment'
            const mimeType =
              typeof attachment?.mime_type === 'string' && attachment.mime_type.trim().length > 0
                ? attachment.mime_type
                : 'application/octet-stream'
            const sizeBytes =
              typeof attachment?.size_bytes === 'number' ? attachment.size_bytes : undefined
            const publicUrl =
              typeof attachment?.public_url === 'string' && attachment.public_url.trim().length > 0
                ? attachment.public_url
                : undefined
            const source =
              typeof attachment?.source === 'string' && attachment.source.trim().length > 0
                ? attachment.source
                : undefined

            return {
              id: attachmentId,
              clientId: attachmentId,
              fileName,
              mimeType,
              sizeBytes,
              url: publicUrl,
              source,
            } satisfies ChatMessageAttachment
          })
          .filter((attachment) => attachment.fileName)

        return {
          id: typeof item?.id === 'string' ? item.id : `${sessionId}-${createdAt}`,
          remoteId: typeof item?.id === 'string' ? item.id : undefined,
          author: sender,
          channel,
          content: typeof item?.content === 'string' ? item.content : '',
          createdAt,
          attachments,
        } satisfies ChatMessage
      })
    },
    [],
  )

  const handleSelectHistorySession = useCallback(
    (sessionId: string) => {
      setSelectedHistorySessionId(sessionId)
      setHistorySelectionError(null)
      setIsHistorySelectionLoading(true)

      fetchHistoryMessages(sessionId)
        .then((messages) => {
          setChatMessages(messages)
          setActiveSessionId(sessionId)
          setActivePanel('main')
        })
        .catch((error) => {
          setHistorySelectionError(
            error instanceof Error ? error.message : 'Failed to load conversation',
          )
        })
        .finally(() => {
          setIsHistorySelectionLoading(false)
        })
    },
    [fetchHistoryMessages],
  )

  const handleRefreshHistorySessions = useCallback(() => {
    setHistorySessionsReloadKey((value) => value + 1)
  }, [])

  const handleRetryHistorySessions = useCallback(() => {
    setHistorySessionsReloadKey((value) => value + 1)
  }, [])

  const handleHistoryPageChange = useCallback((page: number) => {
    if (page < 0) {
      return
    }
    setHistoryPage(page)
  }, [])

  const handleStartNewChatSession = useCallback(() => {
    setChatMessages(createInitialChatMessages())
    setAttachments([])
    setActiveSessionId(null)
    setInteractionMode('default')
    setActivePanel('main')
    setIsChatSending(false)
    setHistorySelectionError(null)
    setSelectedHistorySessionId(null)
    setIsHistorySelectionLoading(false)
    setHistoryError(null)
    setHistorySessionsReloadKey((value) => value + 1)
    setHistoryPage(0)
    setLiveInsights([])
    setLiveResponseSuggestion(null)
    setShowResponsePreview(true)
    setIsInsightProcessing(false)
  }, [])

  useEffect(() => {
    if (activePanel !== 'history') {
      return
    }

    let isMounted = true
    setIsHistoryLoading(true)
    setHistoryError(null)
    setHistorySelectionError(null)

    fetchHistorySessions(historyPage)
      .then(({ sessions, total }) => {
        if (!isMounted) {
          return
        }

        setHistorySessionsTotal(total)
        const totalPages = total > 0 ? Math.ceil(total / HISTORY_SESSIONS_PAGE_SIZE) : 1
        if (historyPage > 0 && historyPage >= totalPages) {
          setHistoryPage(Math.max(totalPages - 1, 0))
          return
        }

        setHistorySessions(sessions)

        setSelectedHistorySessionId((current) => {
          if (current && sessions.some((session) => session.id === current)) {
            return current
          }
          return sessions.length > 0 ? sessions[0].id : null
        })

        if (sessions.length === 0) {
          setHistorySessions([])
          setHistorySelectionError(null)
          // setHistoryMessages([]) // This line was removed from the new_code, so it's removed here.
          // setHistoryMessagesError(null) // This line was removed from the new_code, so it's removed here.
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        setHistorySessions([])
        setSelectedHistorySessionId(null)
        setHistorySessionsTotal(0)
        setHistoryError(error instanceof Error ? error.message : 'Failed to load history')
      })
      .finally(() => {
        if (isMounted) {
          setIsHistoryLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [activePanel, fetchHistorySessions, historyPage, historySessionsReloadKey])

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    window.windowControl?.startDrag(event.screenX, event.screenY)
  }

  const handleScreenshot = () => {
    try {
      window.screenshot.start()
    } catch (error) {
      console.error('Failed to start screenshot', error)
    }
  }

  const handleAttach = useCallback(async () => {
    try {
      const picker = window.attachments?.pickFiles
      if (!picker) {
        console.warn('Attachment picker is not available')
        return
      }

      const selected = await picker()
      if (!selected || selected.length === 0) {
        return
      }

      setAttachments((prev) => [
        ...prev,
        ...selected.map((item) =>
          createAttachment({
            kind: item.kind,
            dataUrl: item.dataUrl,
            mimeType: item.mimeType,
            name: item.name,
            size: item.size,
            filePath: item.filePath,
            source: 'picker',
          }),
        ),
      ])
    } catch (error) {
      console.error('Failed to attach files', error)
    }
  }, [createAttachment])

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }

  const handleStartSession = useCallback(() => {
    setInteractionMode('live')
  }, [])

  const handlePauseSession = useCallback(() => {
    setInteractionMode((prev) => {
      if (prev !== 'live') {
        return prev
      }

      return 'paused'
    })
  }, [])

  const handleResumeSession = useCallback(() => {
    setInteractionMode((prev) => {
      if (prev !== 'paused') {
        return prev
      }

      return 'live'
    })
  }, [])

  const handleStopSession = useCallback(() => {
    setInteractionMode('default')
    setActiveSessionId(null)
  }, [])

  const handleSendChatMessage = useCallback(
    async (content: string, channelOverride?: 'chat' | 'live') => {
    const trimmed = content.trim()
      if (!trimmed || isChatSending) {
      return
    }

      const attachmentsSnapshot = attachments.map((attachment) => ({ ...attachment }))

      const messageAttachments: ChatMessageAttachment[] = []
      const requestAttachments: Array<{
        id: string
        file_name: string
        mime_type: string
        size_bytes: number
        source?: string
        data: string
      }> = []

      for (const snapshot of attachmentsSnapshot) {
        const clientId = snapshot.id
        const fileName = deriveAttachmentName(snapshot)
        const mimeType = snapshot.mimeType ?? 'application/octet-stream'
        const sizeBytes = snapshot.size ?? calculateDataUrlSize(snapshot.dataUrl)

        const chatAttachment: ChatMessageAttachment = {
          clientId,
          fileName,
          mimeType,
          sizeBytes,
          dataUrl: snapshot.dataUrl,
          source: snapshot.source,
        }

        messageAttachments.push(chatAttachment)

        if (snapshot.dataUrl) {
          requestAttachments.push({
            id: clientId,
            file_name: fileName,
            mime_type: mimeType,
            size_bytes: sizeBytes,
            source: snapshot.source,
            data: snapshot.dataUrl,
          })
        }
      }

      const channel = channelOverride ?? (interactionMode === 'live' ? 'live' : 'chat')
      const timestamp = Date.now()
      const userMessageId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${timestamp}-user`
      const assistantTempId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
          : `${timestamp}-assistant`

      const userMessage: ChatMessage = {
        id: userMessageId,
        author: 'user',
        content: trimmed,
        channel,
        createdAt: timestamp,
        attachments: messageAttachments,
      }

      const assistantPlaceholder: ChatMessage = {
        id: assistantTempId,
        author: 'assistant',
        content: '',
        channel,
        createdAt: timestamp,
        pending: true,
      }

      setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder])
      setAttachments([])
      setIsChatSending(true)

      try {
        const currentUser = auth.currentUser
        if (!currentUser) {
          throw new Error('Not authenticated')
        }

        const idToken = await currentUser.getIdToken()
        const response = await fetch(`${API_BASE_URL}/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            session_id: activeSessionId ?? undefined,
            channel,
            message: trimmed,
            client_message_id: userMessageId,
            attachments: requestAttachments,
          }),
        })

        const contentType = response.headers.get('content-type') ?? ''

        if (!response.ok) {
          if (contentType.includes('application/json')) {
            const errorPayload = await response.json().catch(() => null)
            const message =
              errorPayload?.details ?? errorPayload?.error ?? 'Failed to send message'
            throw new Error(message)
          }

          throw new Error('Failed to send message')
        }

        if (!contentType.includes('text/event-stream')) {
          const data: ChatApiResponse = await response.json()

          setActiveSessionId(data.session_id)
          setChatMessages((prev) => {
            const intro =
              prev.length > 0 &&
              prev[0].author === 'assistant' &&
              !prev[0].remoteId &&
              prev[0].content.includes('capture takeaways')
                ? [prev[0]]
                : []

            const mapped = data.messages.map<ChatMessage>((msg) => ({
              id: msg.id,
              remoteId: msg.id,
              author: msg.sender,
              channel: msg.channel,
              content: msg.content,
              createdAt: new Date(msg.created_at).getTime(),
            }))

            return intro.concat(mapped)
          })

          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body from server')
        }

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let resolvedSessionId = activeSessionId
        let streamCompleted = false

        const appendToken = (token: string) => {
          if (!token) {
            return
          }

          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantTempId
                ? {
                    ...msg,
                    content: msg.content + token,
                  }
                : msg,
            ),
          )
        }

        for (;;) {
          const { value, done } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })

          let boundary = buffer.indexOf('\n\n')
          while (boundary !== -1) {
            const rawEvent = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            boundary = buffer.indexOf('\n\n')

            const payload = parseSSEEvent(rawEvent)
            if (!payload || !payload.type) {
              continue
            }

            switch (payload.type) {
              case 'token':
                appendToken(payload.content ?? '')
                break
              case 'message-ack': {
                const serverAttachments = payload.message?.attachments ?? []
                const serverMessageId = payload.message?.id

                setChatMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id !== payload.client_message_id) {
                      return msg
                    }

                    const existingAttachments = msg.attachments ?? []

                    if (serverAttachments.length === 0) {
                      return {
                        ...msg,
                        remoteId: serverMessageId ?? msg.remoteId,
                      }
                    }

                    const normalized: ChatMessageAttachment[] = serverAttachments.map((attachment) => {
                      const clientKey = attachment.client_id ?? attachment.id ?? ''
                      const existing = existingAttachments.find((item) =>
                        item.clientId === clientKey || item.id === clientKey,
                      )

                      return {
                        id: attachment.id ?? existing?.id,
                        clientId: clientKey || existing?.clientId,
                        fileName: attachment.file_name ?? existing?.fileName ?? 'Attachment',
                        mimeType: attachment.mime_type ?? existing?.mimeType ?? 'application/octet-stream',
                        sizeBytes: attachment.size_bytes ?? existing?.sizeBytes,
                        url: attachment.public_url ?? existing?.url,
                        dataUrl: existing?.dataUrl,
                        source: attachment.source ?? existing?.source,
                      } satisfies ChatMessageAttachment
                    })

                    const ackClientIds = new Set(normalized.map((item) => item.clientId))
                    const leftovers = existingAttachments.filter((item) =>
                      item.clientId ? !ackClientIds.has(item.clientId) : true,
                    )

                    return {
                      ...msg,
                      remoteId: serverMessageId ?? msg.remoteId,
                      attachments: normalized.concat(leftovers),
                    }
                  }),
                )

                break
              }
              case 'web-search-start':
                setChatMessages((prev) => {
                  const hasIndicator = prev.some((msg) => msg.searching)
                  if (hasIndicator) {
                    return prev
                  }

                  return prev.concat({
                    id: `search-${Date.now()}`,
                    author: 'assistant',
                    content: 'Searching the web…',
        createdAt: Date.now(),
                    pending: true,
                    searching: true,
                  })
                })
                break
              case 'web-search-progress':
                // No-op for now; indicator already visible.
                break
              case 'web-search-end':
                setChatMessages((prev) => prev.filter((msg) => !msg.searching))
                break
              case 'error': {
                setChatMessages((prev) => prev.filter((msg) => !msg.searching))
                const details = payload.details || payload.error || 'Streaming error'
                throw new Error(details)
              }
              case 'done': {
                streamCompleted = true
                if (payload.session_id) {
                  resolvedSessionId = payload.session_id
                }

                const createdAtIso = payload.message?.created_at
                const createdAtTs = createdAtIso ? Date.parse(createdAtIso) : Date.now()
                const finalContent =
                  typeof payload.message?.content === 'string'
                    ? payload.message.content
                    : ''

                setChatMessages((prev) =>
                  prev
                    .map((msg) =>
                      msg.id === assistantTempId
                        ? {
                            ...msg,
                            remoteId: payload.message?.id ?? msg.remoteId,
                            channel: payload.message?.channel ?? msg.channel,
                            content: finalContent || msg.content,
                            createdAt: createdAtTs,
                            pending: false,
                          }
                        : msg,
                    )
                    .filter((msg) => !msg.searching),
                )
                break
              }
            }
          }
        }

        if (resolvedSessionId && resolvedSessionId !== activeSessionId) {
          setActiveSessionId(resolvedSessionId)
        }

        if (!streamCompleted) {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantTempId
                ? {
                    ...msg,
                    pending: false,
                  }
                : msg,
            ),
          )
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send message'
        console.error('Failed to send chat message', error)
        if (attachmentsSnapshot.length > 0) {
          setAttachments(attachmentsSnapshot)
        }
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantTempId
              ? {
                  ...msg,
                  content: `Unable to generate response. ${errorMessage}`,
                  pending: false,
                }
              : msg,
          ),
        )
      } finally {
        setIsChatSending(false)
      }
    },
    [activeSessionId, interactionMode, isChatSending, attachments],
  )

  const handleOpenInsightInChat = useCallback(
    (insight: LiveInsight) => {
      const parts = [`Live insight: ${insight.title}`, insight.summary]
      if (insight.details) {
        parts.push('', insight.details)
      }

      void handleSendChatMessage(parts.join('\n'), 'live')
    },
    [handleSendChatMessage],
  )

  const liveInsightsStatus = useMemo(() => {
    if (!isLiveInsightsEnabled) {
      return 'disabled' as const
    }

    if (interactionMode === 'paused') {
      return 'paused' as const
    }

    return 'live' as const
  }, [interactionMode, isLiveInsightsEnabled])

  const isLiveExperience = interactionMode !== 'default'

  const handleSelectInsightAction = useCallback(
    (insight: LiveInsight, action: LiveInsightAction) => {
      const parts: string[] = []
      if (insight.title) {
        parts.push(`${insight.title} → ${action.label}`)
      } else {
        parts.push(action.label)
      }
      if (action.description) {
        parts.push(action.description)
      }

      const combined = parts.join('\n').trim()
      if (combined) {
        void handleSendChatMessage(combined, 'live')
      }
    },
    [handleSendChatMessage],
  )

  const handleClearLiveResponse = useCallback(() => {
    if (liveResponseSuggestion) {
      setLiveResponseSuggestion(null)
      window.liveInsights?.clearResponseSuggestion?.()
    } else {
      setShowResponsePreview(false)
    }
  }, [liveResponseSuggestion])

  const handleUseLiveResponse = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed) {
        return
      }

      void handleSendChatMessage(trimmed, 'live')
      if (liveResponseSuggestion) {
        window.liveInsights?.clearResponseSuggestion?.()
        setLiveResponseSuggestion(null)
      } else {
        setShowResponsePreview(false)
      }
    },
    [handleSendChatMessage, liveResponseSuggestion],
  )

  const responseSuggestion = liveResponseSuggestion ?? (showResponsePreview ? PREVIEW_RESPONSE_SUGGESTION : null)

  // Show nothing while loading auth state
  if (isLoading) {
    return null
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-2">
      {user ? (
        <div
          ref={contentRef}
          style={{ maxHeight: MAX_APP_HEIGHT }}
          className="flex w-full flex-col items-stretch gap-1.5"
        >
          {activePanel === 'settings' ? (
            <SettingsPanel
              onClose={() => setActivePanel('main')}
              onMouseDown={handleMouseDown}
              onLogout={logout}
              onLogoutEverywhere={logoutEverywhere}
            />
          ) : activePanel === 'history' ? (
            <HistoryPanel
               onClose={() => setActivePanel('main')}
               onMouseDown={handleMouseDown}
               sessions={historySessions}
               isLoadingSessions={isHistoryLoading}
               sessionsError={historyError}
               onRetrySessions={handleRetryHistorySessions}
               onRefreshSessions={handleRefreshHistorySessions}
               selectedSessionId={selectedHistorySessionId}
               onSelectSession={handleSelectHistorySession}
               isSelectingSession={isHistorySelectionLoading}
               selectionError={historySelectionError}
               pageIndex={historyPage}
               pageSize={HISTORY_SESSIONS_PAGE_SIZE}
               totalSessions={historySessionsTotal}
               onPageChange={handleHistoryPageChange}
             />
          ) : (
            <>
              <AttachmentsBar attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />
              <MainBar
                onMouseDown={handleMouseDown}
                onScreenshot={handleScreenshot}
                onAttach={handleAttach}
                onOpenSettings={() => setActivePanel('settings')}
                onOpenHistory={() => setActivePanel('history')}
                mode={interactionMode}
                onStartSession={handleStartSession}
                onPauseSession={handlePauseSession}
                onResumeSession={handleResumeSession}
                onStopSession={handleStopSession}
                isFullScreenshotCapturing={isFullScreenshotCapturing}
              />
              {isLiveExperience ? (
                <>
                  <LiveInsightsPanel
                    insights={liveInsights}
                    status={liveInsightsStatus}
                    processing={isInsightProcessing}
                    onOpenInsightInChat={handleOpenInsightInChat}
                    onSelectAction={handleSelectInsightAction}
                  />
                  {responseSuggestion ? (
                    <LiveResponsePanel
                      suggestion={responseSuggestion}
                      onUseSuggestion={handleUseLiveResponse}
                      onClear={handleClearLiveResponse}
                    />
                  ) : null}
                  <ChatPanel
                    messages={chatMessages}
                    onSend={(value) => {
                      void handleSendChatMessage(value)
                    }}
                    status={interactionMode}
                    isSending={isChatSending}
                    onStartNewSession={handleStartNewChatSession}
                  />
                </>
              ) : (
                <ChatPanel
                  messages={chatMessages}
                  onSend={(value) => {
                    void handleSendChatMessage(value)
                  }}
                  status={interactionMode}
                  isSending={isChatSending}
                  onStartNewSession={handleStartNewChatSession}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <Welcome onMouseDown={handleMouseDown} ref={contentRef} />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App