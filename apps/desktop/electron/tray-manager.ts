import { Tray, Menu, app, nativeImage } from "electron";
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
    iconPath = path.join(
      process.env.APP_ROOT || path.join(__dirname, ".."),
      "build",
      "icon.png",
    );
  }

  try {
    // Create native image and resize for platform-specific requirements
    let icon = nativeImage.createFromPath(iconPath);

    // macOS menu bar icons should be 16x16 or 22x22 with template style
    if (process.platform === "darwin") {
      icon = icon.resize({ width: 22, height: 22 });
      // Template images are black and white and adapt to dark/light mode
      icon.setTemplateImage(true);
    }

    tray = new Tray(icon);

    // Set tooltip (Windows/Linux - macOS doesn't show tooltips in menu bar)
    if (process.platform !== "darwin") {
      tray.setToolTip(getAppName());
    }

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
        label: `Quit ${getAppName()}`,
        click: () => {
          setQuitting(true);
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    // Platform-specific click behavior
    if (process.platform === "darwin") {
      // macOS: single click opens menu (handled by contextMenu)
      // Can also handle click to show window if desired
      tray.on("click", showWindow);
    } else {
      // Windows/Linux: double click to show window
      tray.on("double-click", showWindow);
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
