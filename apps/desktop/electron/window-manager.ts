import { BrowserWindow, ipcMain, nativeTheme, app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(
  process.env.APP_ROOT || path.join(__dirname, ".."),
  "dist-electron",
);
export const RENDERER_DIST = path.join(
  process.env.APP_ROOT || path.join(__dirname, ".."),
  "dist",
);

let win: BrowserWindow | null;
let isQuitting = false;

function getTitleBarColors() {
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  return {
    backgroundColor: "#ffffff00", // Always transparent
    symbolColor: isDarkMode ? "#ffffff" : "#000000", // White in dark, black in light
  };
}

function updateTitleBarColors() {
  if (win && !win.isDestroyed()) {
    const titleBarColors = getTitleBarColors();
    win.setTitleBarOverlay({
      color: titleBarColors.backgroundColor,
      symbolColor: titleBarColors.symbolColor,
      height: 48,
    });
  }
}

export function createWindow() {
  const titleBarColors = getTitleBarColors();

  win = new BrowserWindow({
    width: 1150,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(
      process.env.APP_ROOT || path.join(__dirname, ".."),
      "build",
      "icon.png",
    ),
    title: "sunless",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: titleBarColors.backgroundColor,
      symbolColor: titleBarColors.symbolColor,
      height: 44,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });

  // Listen for system theme changes and update title bar
  nativeTheme.on("updated", updateTitleBarColors);

  return win;
}

export function showWindow() {
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

export function restartApp() {
  if (VITE_DEV_SERVER_URL) {
    console.log("Development mode: Reloading window instead of restarting app");
    win?.reload();
    showWindow();
  } else {
    try {
      app.relaunch({ args: ["--show-window"] });
      isQuitting = true;
      app.quit();
    } catch (error) {
      console.error("Failed to restart app:", error);
      win?.reload();
      showWindow();
    }
  }
}

export function setQuitting(value: boolean) {
  isQuitting = value;
}

export function getWindow() {
  return win;
}

export function setupWindowControls() {
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
}

export function cleanupWindow() {
  nativeTheme.removeListener("updated", updateTitleBarColors);
}
