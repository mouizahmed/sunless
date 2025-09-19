import { app } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

import {
  createWindow,
  setupWindowControls,
  showWindow,
  setQuitting,
  cleanupWindow
} from "./window-manager";
import { createTray, cleanupTray } from "./tray-manager";
import {
  setupProtocolHandler,
  setupProtocolEvents,
  checkInitialProtocolUrl
} from "./protocol-handler";
import { setupAuthHandlers } from "./auth-handlers";

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🚀 Electron main process starting...");

// Set up app root path
process.env.APP_ROOT = path.join(__dirname, "..");

// App lifecycle handlers
app.on("window-all-closed", () => {
  // Keep app running in background on all platforms
  if (process.platform === "darwin") {
    return; // Standard macOS behavior
  }
  // For other platforms, keep running (can be made configurable)
});

app.on("activate", () => {
  const { BrowserWindow } = require("electron");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
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
  // Set dock/menu bar icon
  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(process.env.APP_ROOT || path.join(__dirname, ".."), "build", "icon.png"));
  }

  createWindow();
  createTray();
  setupWindowControls();
  setupAuthHandlers();

  checkInitialProtocolUrl();

  // Show window if launched with --show-window flag (from restart)
  if (process.argv.includes("--show-window")) {
    showWindow();
  }
});