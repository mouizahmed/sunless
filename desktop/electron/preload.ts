import { ipcRenderer, contextBridge } from 'electron'
import type { IpcRendererEvent } from 'electron'

type ShortcutAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'toggleVisibility'
  | 'screenshot'

type ShortcutState = {
  current: Record<ShortcutAction, string>
  defaults: Record<ShortcutAction, string>
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// Expose window control API
contextBridge.exposeInMainWorld('windowControl', {
  startDrag: (mouseX: number, mouseY: number) => {
    ipcRenderer.send('window-drag-start', { mouseX, mouseY })
  },

  moveDrag: (mouseX: number, mouseY: number, offsetX: number, offsetY: number) => {
    ipcRenderer.send('window-drag-move', { mouseX, mouseY, offsetX, offsetY })
  },

  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore)
  },

  toggleVisibility: () => {
    ipcRenderer.send('toggle-visibility')
  },

  setWindowHeight: (height: number) => {
    ipcRenderer.send('set-window-height', height)
  },

  onDragOffset: (callback: (offset: { x: number; y: number }) => void) => {
    ipcRenderer.on('drag-offset', (_event, offset) => callback(offset))
  },

  onFocusInput: (callback: () => void) => {
    ipcRenderer.on('focus-input', () => callback())
  }
})

// Screenshot API
contextBridge.exposeInMainWorld('screenshot', {
  start: () => {
    ipcRenderer.send('start-screenshot')
  },
  captureSelection: (selection: {
    displayId: string
    x: number
    y: number
    width: number
    height: number
    scaleFactor: number
  }) => {
    return ipcRenderer.invoke('capture-screen-selection', selection)
  },
  cancel: () => {
    ipcRenderer.send('screenshot-cancel')
  },
  close: () => {
    ipcRenderer.send('screenshot-close')
  },
  onResult: (callback: (result: { dataUrl: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { dataUrl: string }) => callback(data)
    ipcRenderer.on('screenshot-result', listener)
    return () => {
      ipcRenderer.off('screenshot-result', listener)
    }
  }
})

contextBridge.exposeInMainWorld('shortcutControl', {
  getAll: () => ipcRenderer.invoke('shortcuts:get') as Promise<ShortcutState>,
  update: (action: ShortcutAction, shortcut: string | null) =>
    ipcRenderer.invoke('shortcuts:update', { action, shortcut }) as Promise<ShortcutState>,
})

// Authentication API
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth Authentication
  authenticateWithGoogle: () => ipcRenderer.invoke('auth:google'),

  // Session Management
  logout: () => ipcRenderer.invoke('auth:logout'),
  logoutEverywhere: (idToken: string) => ipcRenderer.invoke('auth:logout-everywhere', idToken),

  // Event listeners
  onAuthSessionUpdated: (callback: (event: IpcRendererEvent, data: unknown) => void) => {
    const listener = (event: IpcRendererEvent, data: unknown) => callback(event, data)
    ipcRenderer.on('auth-session-updated', listener)
    return () => {
      ipcRenderer.off('auth-session-updated', listener)
    }
  }
})

// Expose environment info
contextBridge.exposeInMainWorld('env', {
  platform: process.platform
})