import { auth } from '@/config/firebase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export type Conversation = {
  id: string
  title: string
  summary: string
  createdAt: number
  updatedAt: number
}

export type ChatMessage = {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolUsageEntry[]
  thinking?: string
  thinkingDuration?: number
  tokenCount: number
  createdAt: number
}

export type ToolUsageEntry = {
  tool_name: string
  result?: string
}

export type SSEEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_use'; tool_name: string; tool_id: string }
  | { type: 'tool_result'; tool_name: string; result: string }
  | { type: 'done'; message?: ChatMessage; user_message?: ChatMessage }
  | { type: 'title'; title: string }
  | { type: 'error'; error: string }

type ApiConversation = {
  id: string
  user_id: string
  title: string
  summary: string
  created_at: string
  updated_at: string
}

type ApiMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: string
  thinking?: string
  thinking_duration?: number
  token_count: number
  created_at: string
}

function toConversation(c: ApiConversation): Conversation {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    createdAt: Date.parse(c.created_at),
    updatedAt: Date.parse(c.updated_at),
  }
}

function toMessage(m: ApiMessage): ChatMessage {
  let toolCalls: ToolUsageEntry[] | undefined
  if (m.tool_calls) {
    try {
      toolCalls = JSON.parse(m.tool_calls) as ToolUsageEntry[]
    } catch {
      // ignore malformed
    }
  }
  return {
    id: m.id,
    conversationId: m.conversation_id,
    role: m.role,
    content: m.content,
    toolCalls,
    thinking: m.thinking || undefined,
    thinkingDuration: m.thinking_duration || undefined,
    tokenCount: m.token_count,
    createdAt: Date.parse(m.created_at),
  }
}

async function getIdToken() {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Not authenticated')
  return await currentUser.getIdToken()
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Request failed')
  }
  return (await response.json()) as T
}

export async function createConversation(title?: string): Promise<Conversation> {
  const idToken = await getIdToken()
  const payload = await fetchJson<{ conversation: ApiConversation }>(
    `${API_BASE_URL}/chat/conversations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ title: title || 'New conversation' }),
    },
  )
  return toConversation(payload.conversation)
}

export async function listConversations(): Promise<Conversation[]> {
  const idToken = await getIdToken()
  const payload = await fetchJson<{ conversations: ApiConversation[] }>(
    `${API_BASE_URL}/chat/conversations`,
    {
      headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
    },
  )
  return (payload.conversations ?? []).map(toConversation)
}

export async function deleteConversation(id: string): Promise<void> {
  const idToken = await getIdToken()
  await fetchJson(`${API_BASE_URL}/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
  })
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const idToken = await getIdToken()
  const payload = await fetchJson<{ messages: ApiMessage[] }>(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
    },
  )
  return (payload.messages ?? []).map(toMessage)
}

export async function* sendMessage(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const idToken = await getIdToken()

  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ content }),
      signal,
    },
  )

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Request failed')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const jsonStr = trimmed.slice(6)
        try {
          const event = JSON.parse(jsonStr) as SSEEvent
          yield event
        } catch {
          // skip malformed lines
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const idToken = await getIdToken()
  const payload = await fetchJson<{ conversation: ApiConversation }>(
    `${API_BASE_URL}/chat/conversations/${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ title }),
    },
  )
  return toConversation(payload.conversation)
}

