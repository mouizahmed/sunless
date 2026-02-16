import { app, BrowserWindow, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { setupAuthHandlers } from './auth-handlers'
import { setupProtocolHandler, setupProtocolEvents, setMainWindow } from './protocol-handler'
import { createWindow, getWindow, setAppQuitting, setWindow } from './window'
import { setupAttachmentHandlers } from './attachments'
import {
  registerKeyboardShortcuts,
  registerMovementShortcuts,
  unregisterMovementShortcuts,
} from './shortcuts'
import { handleFullScreenshotShortcut } from './screenshots'
import { setupIpcHandlers } from './ipc-handlers'
import { destroyTray, setupTray } from './tray'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// Setup protocol handler before app is ready (for OS protocol registration)
setupProtocolHandler()

// Single instance lock - ensure only one instance of the app runs
// This is critical for protocol handling (sunless:// URLs)
const gotTheLock = app.requestSingleInstanceLock()
let isQuitting = false

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // Setup protocol event listeners (for handling sunless:// URLs from second instance)
  setupProtocolEvents()

  app.whenReady().then(() => {
    // Setup auth IPC handlers
    setupAuthHandlers()

    // Setup attachment handlers
    setupAttachmentHandlers()

    // Setup IPC handlers
    setupIpcHandlers()

    // Create the main window
    const win = createWindow()

    // Setup system tray (keep app running even if windows are closed)
    setupTray({
      onQuit: () => {
        isQuitting = true
        setAppQuitting(true)
        app.quit()
      },
    })

    // Register keyboard shortcuts after window is ready
    win.webContents.on('did-finish-load', () => {
      registerKeyboardShortcuts(
        () => {
          const win = getWindow()
          if (!win) return
          if (win.isVisible()) {
            win.hide()
          } else {
            win.show()
          }
        },
        () => {
          void handleFullScreenshotShortcut()
        },
      )
    })

    // Focus input when window is shown
    win.on('show', () => {
      win.webContents.send('focus-input')
      registerMovementShortcuts()
    })

    // Unregister movement shortcuts when window is hidden
    win.on('hide', () => {
      unregisterMovementShortcuts()
    })
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // With a tray icon we keep the app running. Only quit when explicitly requested.
  if (isQuitting) {
    app.quit()
    setWindow(null)
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

// Cleanup shortcuts on quit
app.on('will-quit', () => {
  isQuitting = true
  setAppQuitting(true)
  globalShortcut.unregisterAll()
  destroyTray()
})
