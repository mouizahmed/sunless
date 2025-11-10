import { ipcMain, shell } from 'electron'
import { config } from './config'

// OAuth state expiration time (5 minutes)
const OAUTH_STATE_EXPIRATION_MS = 5 * 60 * 1000

function generateOAuthState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const pendingStates = new Map<string, number>() // Maps state -> timestamp

// Periodic cleanup of expired states (runs every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of pendingStates.entries()) {
    if (now - timestamp > OAUTH_STATE_EXPIRATION_MS) {
      pendingStates.delete(key)
    }
  }
}, 5 * 60 * 1000)

function storeTemporaryState(state: string): void {
  pendingStates.set(state, Date.now())
}

// Validates OAuth state parameter for CSRF protection
export function validateState(state: string): boolean {
  if (!state || typeof state !== 'string') {
    return false
  }

  const timestamp = pendingStates.get(state)
  if (!timestamp) {
    return false
  }

  // Check if state is expired
  const age = Date.now() - timestamp
  if (age > OAUTH_STATE_EXPIRATION_MS) {
    pendingStates.delete(state)
    return false
  }

  // Remove state after validation (one-time use)
  pendingStates.delete(state)
  return true
}

async function handleOAuth(provider: 'google'): Promise<string> {
  try {
    const state = generateOAuthState()
    storeTemporaryState(state)

    const authUrl = `${config.backendUrl}/auth/start?provider=${provider}&state=${state}&platform=desktop`
    await shell.openExternal(authUrl)

    return JSON.stringify({
      status: 'pending',
    })
  } catch (error) {
    console.error(`${provider} OAuth error:`, error)
    throw error
  }
}

export function setupAuthHandlers() {
  // OAuth handlers
  ipcMain.handle('auth:google', async () => {
    try {
      const token = await handleOAuth('google')
      return { success: true, token }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  // Logout handler - main process cleanup
  // Note: Firebase handles session persistence, so no main process state to clear
  ipcMain.handle('auth:logout', async () => {
    return { success: true }
  })

  // Logout everywhere handler
  ipcMain.handle('auth:logout-everywhere', async (_event, idToken: string) => {
    try {
      const response = await fetch(`${config.backendUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Backend logout failed: ${response.status} ${errorText}`,
        )
      }

      return { success: true }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })
}
