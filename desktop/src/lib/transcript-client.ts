import { auth } from '@/config/firebase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

async function getIdToken() {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('Not authenticated')
  }
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

export interface TranscriptSpeakerPayload {
  speaker_key: number
  channel: number
  label: string
}

export interface TranscriptSegmentPayload {
  speaker_key: number
  channel: number
  text: string
  start_time?: number
  end_time?: number
  segment_index: number
}

export interface TranscriptSpeaker {
  id: string
  note_id: string
  user_id: string
  speaker_key: number
  channel: number
  label: string
  color: string
  created_at: string
}

export interface TranscriptSegment {
  id: string
  note_id: string
  speaker_id: string
  text: string
  start_time?: number
  end_time?: number
  segment_index: number
  created_at: string
}

export async function saveTranscriptSegments(
  noteId: string,
  speakers: TranscriptSpeakerPayload[],
  segments: TranscriptSegmentPayload[],
): Promise<{ status: string; saved_count: number }> {
  const idToken = await getIdToken()
  return fetchJson(`${API_BASE_URL}/notes/${noteId}/transcript/segments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ speakers, segments }),
  })
}

export async function getTranscriptSegments(
  noteId: string,
): Promise<{ speakers: TranscriptSpeaker[]; segments: TranscriptSegment[] }> {
  const idToken = await getIdToken()
  return fetchJson(`${API_BASE_URL}/notes/${noteId}/transcript/segments`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  })
}

export async function updateSpeaker(
  speakerId: string,
  updates: { label?: string; color?: string },
): Promise<{ status: string }> {
  const idToken = await getIdToken()
  return fetchJson(`${API_BASE_URL}/transcript/speakers/${speakerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(updates),
  })
}

export async function searchTranscripts(
  query: string,
  limit?: number,
): Promise<{ segments: TranscriptSegment[] }> {
  const idToken = await getIdToken()
  const url = new URL(`${API_BASE_URL}/transcript/search`)
  url.searchParams.set('q', query)
  if (limit !== undefined) url.searchParams.set('limit', String(limit))
  return fetchJson(url.toString(), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  })
}
