import { ipcRenderer, contextBridge } from 'electron'

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

  onDragOffset: (callback: (offset: { x: number; y: number }) => void) => {
    ipcRenderer.on('drag-offset', (_event, offset) => callback(offset))
  },

  onFocusInput: (callback: () => void) => {
    ipcRenderer.on('focus-input', () => callback())
  }
})
