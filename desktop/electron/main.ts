import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 50,
    frame: false,                    // No title bar or window frame
    transparent: true,               // Transparent background
    hasShadow: false,                // No shadow
    alwaysOnTop: true,               // Always on top of other windows
    skipTaskbar: true,               // Hidden from taskbar
    resizable: false,                // Not resizable
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,        // Security: isolate context
      nodeIntegration: false,        // Security: disable node integration
    },
    backgroundColor: '#00000000',    // Fully transparent
  })

  // Enable content protection to hide window from screen sharing
  win.setContentProtection(true)

  // Make window visible on all workspaces/desktops
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Platform-specific configuration
  if (process.platform === 'darwin') {
    // macOS: hide from mission control
    win.setHiddenInMissionControl(true)
  } else if (process.platform === 'win32') {
    // Windows: set highest always-on-top level
    win.setAlwaysOnTop(true, 'screen-saver')
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Register keyboard shortcuts after window is ready
  win.webContents.on('did-finish-load', () => {
    registerKeyboardShortcuts()
  })

  // Focus input when window is shown
  win.on('show', () => {
    win?.webContents.send('focus-input')
  })
}

// Keyboard shortcuts for window movement
function registerKeyboardShortcuts() {
  if (!win) return

  const isMac = process.platform === 'darwin'

  // Unregister all existing shortcuts first
  globalShortcut.unregisterAll()

  // Movement shortcuts
  const shortcuts = {
    moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
    moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
    moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
    moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
    toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
  }

  const movementActions = {
    moveUp: () => {
      if (!win || !win.isVisible()) return
      const [currentX, currentY] = win.getPosition()
      // Get the display that contains the current window position
      const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
      const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
      const minY = currentDisplay.workArea.y
      win.setPosition(currentX, Math.max(minY, currentY - moveIncrement))
    },
    moveDown: () => {
      if (!win || !win.isVisible()) return
      const [currentX, currentY] = win.getPosition()
      // Get the display that contains the current window position
      const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
      const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
      const maxY = currentDisplay.workArea.y + currentDisplay.workArea.height - win.getSize()[1]
      win.setPosition(currentX, Math.min(maxY, currentY + moveIncrement))
    },
    moveLeft: () => {
      if (!win || !win.isVisible()) return
      const [currentX, currentY] = win.getPosition()
      // Get the display that contains the current window position
      const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
      const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
      const minX = currentDisplay.workArea.x
      win.setPosition(Math.max(minX, currentX - moveIncrement), currentY)
    },
    moveRight: () => {
      if (!win || !win.isVisible()) return
      const [currentX, currentY] = win.getPosition()
      // Get the display that contains the current window position
      const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
      const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
      const maxX = currentDisplay.workArea.x + currentDisplay.workArea.width - win.getSize()[0]
      win.setPosition(Math.min(maxX, currentX + moveIncrement), currentY)
    },
  }

  // Register movement shortcuts
  Object.keys(movementActions).forEach((action) => {
    const keybind = shortcuts[action as keyof typeof shortcuts]
    if (keybind) {
      try {
        globalShortcut.register(keybind, movementActions[action as keyof typeof movementActions])
        console.log(`Registered ${action}: ${keybind}`)
      } catch (error) {
        console.error(`Failed to register ${action} (${keybind}):`, error)
      }
    }
  })

  // Register toggle visibility shortcut
  if (shortcuts.toggleVisibility) {
    try {
      globalShortcut.register(shortcuts.toggleVisibility, () => {
        if (!win) return
        if (win.isVisible()) {
          win.hide()
        } else {
          win.show()
          // Focus will be triggered by the 'show' event listener
        }
      })
      console.log(`Registered toggleVisibility: ${shortcuts.toggleVisibility}`)
    } catch (error) {
      console.error(`Failed to register toggleVisibility (${shortcuts.toggleVisibility}):`, error)
    }
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers for window control
ipcMain.on('window-drag-start', (_event, { mouseX, mouseY }) => {
  if (!win) return
  const [winX, winY] = win.getPosition()
  win.webContents.send('drag-offset', {
    x: mouseX - winX,
    y: mouseY - winY
  })
})

ipcMain.on('window-drag-move', (_event, { mouseX, mouseY, offsetX, offsetY }) => {
  if (!win) return
  win.setPosition(mouseX - offsetX, mouseY - offsetY)
})

ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean) => {
  if (!win) return
  win.setIgnoreMouseEvents(ignore, { forward: true })
})

ipcMain.on('toggle-visibility', () => {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
  } else {
    win.show()
  }
})

app.whenReady().then(createWindow)

// Cleanup shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
