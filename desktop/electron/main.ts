import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  desktopCapturer,
  clipboard,
  dialog,
} from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { setupAuthHandlers } from './auth-handlers'
import { setupProtocolHandler, setupProtocolEvents, setMainWindow } from './protocol-handler'
import fs from 'node:fs'

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

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let screenshotWin: BrowserWindow | null = null
let shouldRestoreMainWindowAfterScreenshot = false

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 60,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#00000000',
  })

  // Set window reference for protocol handler (auth callbacks)
  setMainWindow(win)

  // Enable content protection to hide window from screen sharing
  win.setContentProtection(false)

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
    registerMovementShortcuts()
  })

  // Unregister movement shortcuts when window is hidden
  win.on('hide', () => {
    unregisterMovementShortcuts()
  })
}

// Define shortcuts and movement actions at module level
const isMac = process.platform === 'darwin'

type MovementAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
type ShortcutAction = MovementAction | 'toggleVisibility'
type ShortcutPayloadAction = ShortcutAction | 'screenshot'
type ShortcutUpdatePayload = {
  action: ShortcutPayloadAction
  shortcut: string | null
}

const defaultShortcuts: Record<ShortcutAction, string> = {
  moveUp: isMac ? 'Cmd+Up' : 'Ctrl+Up',
  moveDown: isMac ? 'Cmd+Down' : 'Ctrl+Down',
  moveLeft: isMac ? 'Cmd+Left' : 'Ctrl+Left',
  moveRight: isMac ? 'Cmd+Right' : 'Ctrl+Right',
  toggleVisibility: isMac ? 'Cmd+Space' : 'Ctrl+Space',
}

const defaultScreenshotShortcut = isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S'
const imageMimeTypes: Record<string, string> = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.pjpeg': 'image/jpeg',
  '.pjp': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

type PickedAttachment = {
  kind: 'image' | 'file'
  mimeType: string
  name: string
  size: number
  filePath: string
  dataUrl?: string
}

ipcMain.handle('attachments:pick', async () => {
  if (!win) {
    throw new Error('Main window is not available')
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select attachments',
    buttonLabel: 'Attach',
    properties: ['openFile', 'multiSelections'],
  })

  if (canceled || filePaths.length === 0) {
    return []
  }

  const results = await Promise.allSettled<PickedAttachment | null>(
    filePaths.map(async (filePath) => {
      const extension = path.extname(filePath).toLowerCase()
      const imageMimeType = imageMimeTypes[extension]
      const isImage = Boolean(imageMimeType)
      const mimeType = imageMimeType ?? 'application/octet-stream'
      const stats = await fs.promises.stat(filePath)
      const dataUrl = isImage
        ? `data:${mimeType};base64,${(await fs.promises.readFile(filePath)).toString('base64')}`
        : undefined

      return {
        kind: isImage ? 'image' : 'file',
        mimeType,
        name: path.basename(filePath),
        size: stats.size,
        filePath,
        dataUrl,
      } satisfies PickedAttachment
    }),
  )

  return results
    .map((result) => {
      if (result.status !== 'fulfilled') {
        console.error('Failed to load attachment', result.reason)
        return null
      }

      return result.value
    })
    .filter((value): value is PickedAttachment => Boolean(value))
})


function storageFilePath(fileName: string) {
  const appData = app.getPath('userData')
  return path.join(appData, fileName)
}

const shortcutsFilePath = storageFilePath('shortcuts.json')

function readPersistedShortcuts() {
  try {
    const raw = fs.readFileSync(shortcutsFilePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Record<ShortcutPayloadAction, string>>

    return parsed
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return {}
    }

    console.error('Failed to read persisted shortcuts:', error)
    return {}
  }
}

function writePersistedShortcuts(values: Record<ShortcutPayloadAction, string>) {
  try {
    fs.mkdirSync(path.dirname(shortcutsFilePath), { recursive: true })
    fs.writeFileSync(shortcutsFilePath, JSON.stringify(values, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to write shortcuts configuration:', error)
  }
}

const persistedShortcuts = readPersistedShortcuts()

let shortcuts: Record<ShortcutAction, string> = {
  ...defaultShortcuts,
  ...Object.fromEntries(
    Object.entries(persistedShortcuts).filter(
      (entry): entry is [ShortcutAction, string] =>
        ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'toggleVisibility'].includes(entry[0]),
    ),
  ),
}

let screenshotShortcut =
  typeof persistedShortcuts.screenshot === 'string' && persistedShortcuts.screenshot.trim()
    ? persistedShortcuts.screenshot.trim()
    : defaultScreenshotShortcut

function getShortcutState() {
  return {
    current: {
      ...shortcuts,
      screenshot: screenshotShortcut,
    },
    defaults: {
      ...defaultShortcuts,
      screenshot: defaultScreenshotShortcut,
    },
  }
}

const movementActions = {
  moveUp: () => {
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
    const minY = currentDisplay.workArea.y
    win.setPosition(currentX, Math.max(minY, currentY - moveIncrement))
  },
  moveDown: () => {
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
    const maxY = currentDisplay.workArea.y + currentDisplay.workArea.height - win.getSize()[1]
    win.setPosition(currentX, Math.min(maxY, currentY + moveIncrement))
  },
  moveLeft: () => {
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
    const minX = currentDisplay.workArea.x
    win.setPosition(Math.max(minX, currentX - moveIncrement), currentY)
  },
  moveRight: () => {
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1)
    const maxX = currentDisplay.workArea.x + currentDisplay.workArea.width - win.getSize()[0]
    win.setPosition(Math.min(maxX, currentX + moveIncrement), currentY)
  },
}

function closeScreenshotWindow() {
  if (screenshotWin && !screenshotWin.isDestroyed()) {
    screenshotWin.close()
  }
}

function createScreenshotWindow(display: Electron.Display) {
  if (screenshotWin && !screenshotWin.isDestroyed()) {
    screenshotWin.focus()
    return
  }

  const { bounds } = display

  screenshotWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: true,
    show: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    type: 'toolbar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  screenshotWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  screenshotWin.setContentProtection(true)
  screenshotWin.setMenuBarVisibility(false)
  screenshotWin.setIgnoreMouseEvents(false)
  const alwaysOnTopLevel = (process.platform === 'darwin' || process.platform === 'win32') ? 'screen-saver' : 'floating'
  screenshotWin.setAlwaysOnTop(true, alwaysOnTopLevel)

  screenshotWin.on('closed', () => {
    screenshotWin = null
    if (shouldRestoreMainWindowAfterScreenshot && win && !win.isDestroyed()) {
      win.show()
      win.focus()
    }
    shouldRestoreMainWindowAfterScreenshot = false
  })

  const query = new URLSearchParams({
    view: 'screenshot',
    displayId: String(display.id),
    scaleFactor: String(display.scaleFactor),
  })

  if (VITE_DEV_SERVER_URL) {
    screenshotWin.loadURL(`${VITE_DEV_SERVER_URL}?${query.toString()}`)
  } else {
    screenshotWin.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      query: Object.fromEntries(query.entries()),
    })
  }

  screenshotWin.once('ready-to-show', () => {
    screenshotWin?.show()
    screenshotWin?.focus()
  })
}

function startScreenshotCapture() {
  const cursorPoint = screen.getCursorScreenPoint()
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint)
  if (!targetDisplay) return

  if (screenshotWin && !screenshotWin.isDestroyed()) {
    screenshotWin.focus()
    return
  }

  if (win && !win.isDestroyed()) {
    shouldRestoreMainWindowAfterScreenshot = win.isVisible()
    if (shouldRestoreMainWindowAfterScreenshot) {
      win.hide()
    }
  } else {
    shouldRestoreMainWindowAfterScreenshot = false
  }

  createScreenshotWindow(targetDisplay)
}

function registerMovementShortcuts() {
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
}

// Unregister movement shortcuts
function unregisterMovementShortcuts() {
  Object.keys(movementActions).forEach((action) => {
    const keybind = shortcuts[action as keyof typeof shortcuts]
    if (keybind && globalShortcut.isRegistered(keybind)) {
      globalShortcut.unregister(keybind)
      console.log(`Unregistered ${action}: ${keybind}`)
    }
  })
}

// Keyboard shortcuts for window movement
function registerKeyboardShortcuts() {
  if (!win) return

  // Unregister all existing shortcuts first
  globalShortcut.unregisterAll()

  // Register movement shortcuts (window is visible by default)
  registerMovementShortcuts()

  // Register toggle visibility shortcut (always active)
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

  if (screenshotShortcut) {
    try {
      globalShortcut.register(screenshotShortcut, () => {
        startScreenshotCapture()
      })
      console.log(`Registered screenshot: ${screenshotShortcut}`)
    } catch (error) {
      console.error(`Failed to register screenshot (${screenshotShortcut}):`, error)
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
    setMainWindow(null)
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

ipcMain.on('set-window-height', (_event, rawHeight: number) => {
  if (!win) return
  const newHeight = Math.max(60, Math.round(rawHeight))
  const [currentWidth, currentHeight] = win.getSize()

  // Only resize if height actually changed
  if (currentHeight !== newHeight) {
    const [x, y] = win.getPosition()
    

    // Adjust position to grow/shrink downward (keep top edge fixed)
    win.setBounds({
      x,
      y,
      width: currentWidth,
      height: newHeight
    }, false)
  }
})

ipcMain.on('toggle-visibility', () => {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
  } else {
    win.show()
  }
})

ipcMain.on('start-screenshot', () => {
  startScreenshotCapture()
})

ipcMain.on('screenshot-close', () => {
  closeScreenshotWindow()
})

ipcMain.on('screenshot-cancel', () => {
  closeScreenshotWindow()
})

ipcMain.handle('capture-screen-selection', async (_event, payload: {
  displayId: string
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}) => {
  try {
    const {
      displayId,
      x,
      y,
      width,
      height,
      scaleFactor,
    } = payload

    if (width <= 0 || height <= 0) {
      throw new Error('Invalid capture dimensions')
    }

    const targetDisplay = screen.getAllDisplays().find((display) => String(display.id) === String(displayId))
    if (!targetDisplay) {
      throw new Error(`Display ${displayId} not found`)
    }

    const effectiveScaleFactor = scaleFactor > 0 ? scaleFactor : targetDisplay.scaleFactor || 1
    const captureWidth = Math.max(1, Math.round(targetDisplay.bounds.width * targetDisplay.scaleFactor))
    const captureHeight = Math.max(1, Math.round(targetDisplay.bounds.height * targetDisplay.scaleFactor))

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: captureWidth,
        height: captureHeight,
      },
    })

    const displayIdString = String(displayId)
    const source = sources.find((candidate) => {
      if (candidate.display_id === displayIdString) return true
      const idSegments = candidate.id.split(':')
      return idSegments.includes(displayIdString)
    })

    if (!source) {
      throw new Error(`Unable to locate capture source for display ${displayIdString}`)
    }

    const cropRect = {
      x: Math.max(0, Math.round(x * effectiveScaleFactor)),
      y: Math.max(0, Math.round(y * effectiveScaleFactor)),
      width: Math.round(width * effectiveScaleFactor),
      height: Math.round(height * effectiveScaleFactor),
    }

    if (cropRect.width <= 0 || cropRect.height <= 0) {
      throw new Error('Capture size is too small')
    }

    const thumbnailSize = source.thumbnail.getSize()
    if (cropRect.x + cropRect.width > thumbnailSize.width) {
      cropRect.width = Math.max(1, thumbnailSize.width - cropRect.x)
    }
    if (cropRect.y + cropRect.height > thumbnailSize.height) {
      cropRect.height = Math.max(1, thumbnailSize.height - cropRect.y)
    }

    const croppedImage = source.thumbnail.crop(cropRect)
    clipboard.writeImage(croppedImage)

    const dataUrl = `data:image/png;base64,${croppedImage.toPNG().toString('base64')}`
    win?.webContents.send('screenshot-result', { dataUrl })

    setImmediate(() => {
      closeScreenshotWindow()
    })

    return { dataUrl }
  } catch (error) {
    closeScreenshotWindow()
    throw error
  }
})

ipcMain.handle('shortcuts:get', () => {
  return getShortcutState()
})

ipcMain.handle('shortcuts:update', (_event, payload: ShortcutUpdatePayload) => {
  const { action, shortcut } = payload

  if (!action) {
    throw new Error('Shortcut action is required')
  }

  if (action !== 'screenshot' && !(action in shortcuts)) {
    throw new Error(`Unsupported shortcut action: ${action}`)
  }

  const targetDefault =
    action === 'screenshot'
      ? defaultScreenshotShortcut
      : defaultShortcuts[action as ShortcutAction]

  const nextShortcut = (shortcut ?? targetDefault).trim()

  if (!nextShortcut) {
    throw new Error('Shortcut value cannot be empty')
  }

  const previousShortcut =
    action === 'screenshot'
      ? screenshotShortcut
      : shortcuts[action as ShortcutAction]

  if (previousShortcut === nextShortcut) {
    return getShortcutState()
  }

  if (action === 'screenshot') {
    screenshotShortcut = nextShortcut
  } else {
    shortcuts = {
      ...shortcuts,
      [action]: nextShortcut,
    }
  }

  registerKeyboardShortcuts()

  const windowVisible = Boolean(win?.isVisible())
  if (win && !windowVisible) {
    unregisterMovementShortcuts()
  }

  const shouldValidate =
    action === 'screenshot' ||
    action === 'toggleVisibility' ||
    windowVisible

  if (shouldValidate) {
    const isRegistered = globalShortcut.isRegistered(nextShortcut)

    if (!isRegistered) {
      if (action === 'screenshot') {
        screenshotShortcut = previousShortcut
      } else if (previousShortcut) {
        shortcuts = {
          ...shortcuts,
          [action]: previousShortcut,
        }
      }

      registerKeyboardShortcuts()

      if (win && !windowVisible) {
        unregisterMovementShortcuts()
      }

      throw new Error(`Failed to register shortcut: ${nextShortcut}`)
    }
  }

  const nextState = getShortcutState()
  writePersistedShortcuts(nextState.current)

  return nextState
})

// Setup protocol handler before app is ready (for OS protocol registration)
setupProtocolHandler()

// Single instance lock - ensure only one instance of the app runs
// This is critical for protocol handling (sunless:// URLs)
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // Setup protocol event listeners (for handling sunless:// URLs from second instance)
  setupProtocolEvents()

  app.whenReady().then(() => {
    // Setup auth IPC handlers
    setupAuthHandlers()

    // Create the main window
    createWindow()
  })
}

// Cleanup shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
