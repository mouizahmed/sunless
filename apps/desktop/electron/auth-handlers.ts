import { ipcMain, shell } from "electron";
import { AuthStore } from "./auth-store";
import { getWindow } from "./window-manager";
import { config } from "./config";

const OAUTH_PROVIDERS = {
  google: {
    providerId: "google.com",
    scopes: ["openid", "email", "profile"],
  },
  microsoft: {
    providerId: "microsoft.com",
    scopes: ["openid", "email", "profile"],
  },
};


function generateOAuthState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const pendingStates = new Map<string, { timestamp: number; provider: string }>();

async function storeTemporaryState(state: string, provider: string): Promise<void> {
  // Clean up expired states (older than 10 minutes)
  const now = Date.now();
  for (const [key, value] of pendingStates.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) {
      pendingStates.delete(key);
    }
  }

  pendingStates.set(state, { timestamp: now, provider });
}

export function validateState(state: string): boolean {
  if (!state || typeof state !== 'string') return false;

  const stateData = pendingStates.get(state);
  if (!stateData) return false;

  // Check if state is expired (10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    pendingStates.delete(state);
    return false;
  }

  // Remove state after validation (one-time use)
  pendingStates.delete(state);
  return true;
}

async function handleOAuth(provider: keyof typeof OAUTH_PROVIDERS): Promise<string> {
  try {
    const state = generateOAuthState();
    await storeTemporaryState(state, provider);

    const authUrl = `${config.backendUrl}/auth/start?provider=${provider}&state=${state}&platform=desktop`;

    console.log(`🔗 Generated auth URL: ${authUrl}`);
    console.log(`🌐 Backend URL from config: ${config.backendUrl}`);
    console.log(`🔧 Config object:`, config);

    // Validate URL before opening
    try {
      const parsed = new URL(authUrl);
      console.log(`✅ URL validation passed: ${parsed.toString()}`);
    } catch (error) {
      console.error(`❌ URL validation failed:`, error);
      throw new Error('Invalid authentication URL generated');
    }

    console.log(`🚀 Attempting to open URL in browser using shell.openExternal...`);

    try {
      await shell.openExternal(authUrl);
      console.log(`✅ Successfully opened browser for ${provider} authentication`);
    } catch (error) {
      console.error(`❌ shell.openExternal failed:`, error);
      throw new Error('Failed to open authentication URL in browser');
    }

    return JSON.stringify({
      status: "pending",
      state,
      message: "Authentication started - waiting for browser completion",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`${provider} OAuth error:`, error);
    throw error;
  }
}


export function setupAuthHandlers() {
  // OAuth handlers
  ipcMain.handle("auth:google", async () => {
    try {
      const token = await handleOAuth("google");
      return { success: true, token };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle("auth:microsoft", async () => {
    try {
      const token = await handleOAuth("microsoft");
      return { success: true, token };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Logout handler
  ipcMain.handle("auth:logout", async () => {
    try {
      const win = getWindow();
      if (win && !win.isDestroyed()) {
        await win.webContents.executeJavaScript(
          `window.__sunlessBackendLogout && window.__sunlessBackendLogout()`,
        );
      }

      AuthStore.clearAuth();
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // Set auth state
  ipcMain.handle("auth:set-state", async (_event, isAuthenticated: boolean) => {
    try {
      AuthStore.setAuthState(isAuthenticated);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

}