import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

import {
  createWindow,
  setupWindowControls,
  showWindow,
  setQuitting,
  cleanupWindow,
} from "./window-manager";
import { createTray, cleanupTray } from "./tray-manager";
import {
  setupProtocolHandler,
  setupProtocolEvents,
  checkInitialProtocolUrl,
} from "./protocol-handler";
import { setupAuthHandlers } from "./auth-handlers";

dotenv.config({ debug: false, override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Electron main process starting...");

process.env.APP_ROOT = path.join(__dirname, "..");

app.on("window-all-closed", () => {
  // Keep app running in background for system tray (Windows) and menu bar (macOS)
  // Don't quit the app - user can quit via tray/menu bar menu
});

app.on("activate", () => {
  // On macOS, re-create window when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    // If window exists but is hidden, show it
    showWindow();
  }
});

app.on("before-quit", () => {
  setQuitting(true);
});

app.on("will-quit", () => {
  cleanupTray();
  cleanupWindow();
});

// Protocol setup
setupProtocolHandler();
setupProtocolEvents();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

// App initialization
app.whenReady().then(() => {
  // Set dock icon for macOS
  if (process.platform === "darwin") {
    app.dock.setIcon(
      path.join(
        process.env.APP_ROOT || path.join(__dirname, ".."),
        "build",
        "icon.png",
      ),
    );
    // Keep dock icon visible (can be hidden if you want menu bar only)
    // app.dock.hide(); // Uncomment to hide dock icon and run as menu bar only app
  }

  createWindow();
  createTray(); // Creates system tray (Windows) or menu bar icon (macOS)
  setupWindowControls();
  setupAuthHandlers();

  checkInitialProtocolUrl();

  // Show window if launched with --show-window flag (from restart)
  if (process.argv.includes("--show-window")) {
    showWindow();
  }
});
