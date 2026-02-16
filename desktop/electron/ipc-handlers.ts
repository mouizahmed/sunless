import { ipcMain } from 'electron'
import { closeDashboardWindow, createDashboardWindow, getDashboardWindow, getWindow } from './window'
import {
  registerKeyboardShortcuts,
  unregisterMovementShortcuts,
  getShortcutState,
  updateShortcut,
} from './shortcuts'
import {
  startScreenshotCapture,
  closeScreenshotWindow,
  handleFullScreenshotShortcut,
  captureScreenSelection,
} from './screenshots'

export function setupIpcHandlers() {
  // Window control IPC handlers
  ipcMain.on('window-drag-start', (_event, { mouseX, mouseY }) => {
    const win = getWindow()
    if (!win) return
    const [winX, winY] = win.getPosition()
    win.webContents.send('drag-offset', {
      x: mouseX - winX,
      y: mouseY - winY,
    })
  })

  ipcMain.on('window-drag-move', (_event, { mouseX, mouseY, offsetX, offsetY }) => {
    const win = getWindow()
    if (!win) return
    win.setPosition(mouseX - offsetX, mouseY - offsetY)
  })

  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean) => {
    const win = getWindow()
    if (!win) return
    win.setIgnoreMouseEvents(ignore, { forward: true })
  })

  ipcMain.on('set-window-height', (_event, rawHeight: number) => {
    const win = getWindow()
    if (!win) return
    const newHeight = Math.max(60, Math.round(rawHeight))
    const [currentWidth, currentHeight] = win.getSize()

    // Only resize if height actually changed
    if (currentHeight !== newHeight) {
      const [x, y] = win.getPosition()

      // Adjust position to grow/shrink downward (keep top edge fixed)
      win.setBounds(
        {
          x,
          y,
          width: currentWidth,
          height: newHeight,
        },
        false,
      )
    }
  })

  ipcMain.on('set-window-size', (_event, payload: { width: number; height: number }) => {
    const win = getWindow()
    if (!win) return
    const width = Math.max(420, Math.round(payload?.width ?? 0))
    const height = Math.max(60, Math.round(payload?.height ?? 0))
    const [currentWidth, currentHeight] = win.getSize()
    if (currentWidth === width && currentHeight === height) return

    const [x, y] = win.getPosition()
    // Keep top-left fixed; grow/shrink down/right.
    win.setBounds({ x, y, width, height }, false)
  })

  ipcMain.on('toggle-visibility', () => {
    const win = getWindow()
    if (!win) return
    if (win.isVisible()) {
      win.hide()
    } else {
      // If the dashboard is open, treat "show overlay" as "return to overlay".
      const dashboard = getDashboardWindow()
      if (dashboard && !dashboard.isDestroyed()) {
        closeDashboardWindow()
      }
      win.show()
    }
  })

  ipcMain.on('dashboard:open', (_event, payload?: { noteId?: string }) => {
    const overlay = getWindow()
    if (overlay && !overlay.isDestroyed() && overlay.isVisible()) {
      overlay.hide()
    }

    const noteId = typeof payload?.noteId === 'string' ? payload.noteId : undefined
    const dashboard = getDashboardWindow()
    if (dashboard && !dashboard.isDestroyed()) {
      if (noteId) {
        dashboard.webContents.send('dashboard:select-note', { noteId })
      }
      dashboard.show()
      dashboard.focus()
      return
    }

    const created = createDashboardWindow(noteId)
    created.show()
    created.focus()
  })

  ipcMain.on('dashboard:close', () => {
    const dashboard = getDashboardWindow()
    if (dashboard && !dashboard.isDestroyed()) {
      closeDashboardWindow()
    }

    const overlay = getWindow()
    if (overlay && !overlay.isDestroyed()) {
      overlay.show()
      overlay.focus()
    }
  })

  // Screenshot IPC handlers
  ipcMain.on('start-screenshot', () => {
    startScreenshotCapture()
  })

  ipcMain.on('screenshot-close', () => {
    closeScreenshotWindow()
  })

  ipcMain.on('screenshot-cancel', () => {
    closeScreenshotWindow()
  })

  ipcMain.handle('capture-screen-selection', async (_event, payload) => {
    try {
      return await captureScreenSelection(payload)
    } catch (error) {
      closeScreenshotWindow()
      throw error
    }
  })

  // Shortcuts IPC handlers
  ipcMain.handle('shortcuts:get', () => {
    return getShortcutState()
  })

  ipcMain.handle('shortcuts:update', (_event, payload) => {
    const win = getWindow()
    const windowVisible = Boolean(win?.isVisible())

    const result = updateShortcut(payload)

    // Re-register shortcuts after update
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

    if (win && !windowVisible) {
      unregisterMovementShortcuts()
    }

    return result
  })

}
