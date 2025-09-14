import { app, BrowserWindow, ipcMain, Tray, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let tray: Tray | null;
let isQuitting = false;

// App metadata from package.json - Electron automatically reads these
const getAppName = () => app.getName() || "Sunless"; // fallback for dev mode
const getAppVersion = () => `v${app.getVersion()}` || "v1.0.0"; // fallback for dev mode

function createWindow() {
  win = new BrowserWindow({
    width: 1150,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.APP_ROOT, "build", "icon.png"),
    title: "sunless",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1f1f1f",
      symbolColor: "#ffffff",
      height: 48,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // Hide window instead of closing when user clicks close button
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });
}

// Keep app running in background when all windows are closed
app.on("window-all-closed", () => {
  // On macOS, keep app running in background (standard behavior)
  // On Windows/Linux, this is configurable - for now we keep it running
  // TODO: Add user preference for background behavior
  if (process.platform === "darwin") {
    // Standard macOS behavior - always keep running
    return;
  }
  // For other platforms, keep running (can be made configurable)
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

// IPC handlers for window controls
ipcMain.handle("window-minimize", () => {
  win?.minimize();
});

ipcMain.handle("window-maximize", () => {
  if (win?.isMaximized()) {
    win?.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle("window-close", () => {
  win?.close();
});

function createTray() {
  let iconPath;
  if (app.isPackaged) {
    // Correct path for the packaged app, inside the `resources` directory
    iconPath = path.join(process.resourcesPath, "build", "icon.png");
  } else {
    // Correct path for development mode, relative to the project root
    iconPath = path.join(process.env.APP_ROOT, "build", "icon.png");
  }

  try {
    tray = new Tray(iconPath);
    tray.setToolTip(getAppName());

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Open ${getAppName()}`,
        click: showWindow,
      },
      {
        label: "Login",
        click: showWindow, // TODO: Add specific login logic
      },
      { type: "separator" },
      {
        label: `${getAppName()} ${getAppVersion()}`,
        enabled: false,
      },
      {
        label: "Latest version (just checked!)", // TODO: Make dynamic
        enabled: false,
      },
      {
        label: "Check for updates",
        click: () => {
          // TODO: Implement update check functionality
        },
      },
      { type: "separator" },
      {
        label: `Restart ${getAppName()}`,
        click: restartApp,
      },
      {
        label: `Quit ${getAppName()} Completely`,
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    // Double click to show window (Windows/Linux behavior)
    tray.on("double-click", showWindow);

    // Single click to show window (macOS behavior)
    if (process.platform === "darwin") {
      tray.on("click", showWindow);
    }
  } catch (error) {
    console.error("Failed to create system tray:", error);
    // App can still function without tray
  }
}

function showWindow() {
  if (!win) {
    createWindow();
  }
  win?.show();
  win?.focus();

  // Platform-specific window focusing
  if (process.platform === "win32") {
    win?.setAlwaysOnTop(true);
    win?.setAlwaysOnTop(false);
  }
}

function restartApp() {
  if (VITE_DEV_SERVER_URL) {
    // In development, reload instead of restart (limitation of dev environment)
    console.log("Development mode: Reloading window instead of restarting app");
    win?.reload();
    showWindow();
  } else {
    // Production restart
    try {
      app.relaunch({ args: ["--show-window"] });
      isQuitting = true;
      app.quit();
    } catch (error) {
      console.error("Failed to restart app:", error);
      // Fallback to window reload
      win?.reload();
      showWindow();
    }
  }
}

app.whenReady().then(() => {
  // Set dock/menu bar icon
  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(process.env.APP_ROOT, "build", "icon.png"));
  }

  createWindow();
  createTray();

  // Show window if launched with --show-window flag (from restart)
  if (process.argv.includes("--show-window")) {
    showWindow();
  }
});

// Cleanup when app is closing
app.on("will-quit", () => {
  // Cleanup tray
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});
