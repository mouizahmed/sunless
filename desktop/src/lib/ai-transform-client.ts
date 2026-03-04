import { auth } from '@/config/firebase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export type TransformAction = 'improve' | 'fix_grammar' | 'make_shorter' | 'make_longer' | 'change_tone'

async function getIdToken(): Promise<string> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Not authenticated')
  return await currentUser.getIdToken()
}

export async function transformText(action: TransformAction, text: string): Promise<string> {
  const idToken = await getIdToken()
  const response = await fetch(`${API_BASE_URL}/ai/transform`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ action, text }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Transform failed')
  }

  const payload = (await response.json()) as { result: string }
  return payload.result
}
