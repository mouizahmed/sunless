import { app } from "electron";
import path from "node:path";
import { getWindow, showWindow } from "./window-manager";
import { AuthStore } from "./auth-store";
import { config } from "./config";

export function setupProtocolHandler() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      const success = app.setAsDefaultProtocolClient(
        "sunless",
        process.execPath,
        [path.resolve(process.argv[1])],
      );
      if (!success) {
        console.log("Protocol registration failed in development mode");
      }
    }
  } else {
    const success = app.setAsDefaultProtocolClient("sunless");
    if (!success) {
      console.log("Protocol registration failed in production mode");
    }
  }
}

export function setupProtocolEvents() {
  app.on("second-instance", (_event, commandLine) => {
    const win = getWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.show();
    }

    const url = commandLine.find((arg) => arg.startsWith("sunless://"));
    if (url) {
      handleProtocolUrl(url);
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });

  app.on("ready", () => {
    const protocolUrl = process.argv.find((arg) =>
      arg.startsWith("sunless://"),
    );
    if (protocolUrl) {
      handleProtocolUrl(protocolUrl);
    }
  });
}

async function handleProtocolUrl(url: string) {
  if (!url || typeof url !== "string" || !url.startsWith("sunless://")) {
    return;
  }

  try {
    const parsed = new URL(url);

    // Handle auth callback - sunless://auth-complete?code=ABC123
    if (
      parsed.hostname === "auth-complete" ||
      parsed.pathname.replace(/^\/|\/$/g, "") === "auth-complete"
    ) {
      await handleAuthComplete(parsed);
    }
    // Future: Add more protocol handlers here
  } catch (error) {
    console.error("Error parsing protocol URL:", error);
  }
}

async function handleAuthComplete(parsed: URL) {
  const code = parsed.searchParams.get("code") || undefined;
  showWindow();

  if (code) {
    await completeAuthenticationWithCode(code);
  }

  // if (Notification.isSupported()) {
  //   new Notification({
  //     title: "Sunless",
  //     body: "Authentication completed! Welcome back.",
  //     icon: path.join(
  //       process.env.APP_ROOT || path.join(__dirname, ".."),
  //       "build",
  //       "icon.png",
  //     ),
  //   }).show();
  // }
}

function validateOAuthCode(code: string): boolean {
  // OAuth codes should be alphanumeric with possible hyphens/underscores
  // Typically 20-128 characters long
  if (typeof code !== "string") return false;
  if (code.length < 10 || code.length > 256) return false;
  if (!/^[a-zA-Z0-9\-_]+$/.test(code)) return false;
  return true;
}

async function completeAuthenticationWithCode(code: string): Promise<void> {
  if (!code || !validateOAuthCode(code)) {
    console.warn("Invalid OAuth code format detected");
    return;
  }

  try {
    const response = await fetch(`${config.backendUrl}/auth/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const win = getWindow();
    if (!response.ok) {
      const responseText = await response.text();
      if (win && !win.isDestroyed()) {
        win.webContents.send("auth-session-updated", {
          success: false,
          error: `Authentication failed (${response.status}): ${responseText}`,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }

    const authResult = await response.json();

    if (authResult.status === "success" && authResult.user) {
      if (authResult.firebaseToken) {
        AuthStore.setAuthState(true);
        if (win && !win.isDestroyed()) {
          win.webContents.send("auth-session-updated", {
            success: true,
            firebaseToken: authResult.firebaseToken,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        if (win && !win.isDestroyed()) {
          win.webContents.send("auth-session-updated", {
            success: false,
            error: "Authentication completed but no token received",
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      if (win && !win.isDestroyed()) {
        win.webContents.send("auth-session-updated", {
          success: false,
          error:
            authResult.error || "Authentication was not completed successfully",
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("auth-session-updated", {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export function checkInitialProtocolUrl() {
  const initialProtocolUrl = process.argv.find((arg) =>
    arg.startsWith("sunless://"),
  );
  if (initialProtocolUrl) {
    setTimeout(() => handleProtocolUrl(initialProtocolUrl), 1000);
  }
}
