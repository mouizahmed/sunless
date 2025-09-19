import { Tray, Menu, app } from "electron";
import path from "node:path";
import { showWindow, restartApp, setQuitting } from "./window-manager";

let tray: Tray | null;

const getAppName = () => app.getName() || "Sunless";
const getAppVersion = () => `v${app.getVersion()}` || "v1.0.0";

export function createTray() {
  let iconPath;
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, "build", "icon.png");
  } else {
    iconPath = path.join(process.env.APP_ROOT || path.join(__dirname, ".."), "build", "icon.png");
  }

  try {
    tray = new Tray(iconPath);
    tray.setToolTip(getAppName());

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Open ${getAppName()}`,
        click: showWindow,
      },
      { type: "separator" },
      {
        label: `${getAppName()} ${getAppVersion()}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: `Restart ${getAppName()}`,
        click: restartApp,
      },
      {
        label: `Quit ${getAppName()} Completely`,
        click: () => {
          setQuitting(true);
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
  }
}

export function cleanupTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
}