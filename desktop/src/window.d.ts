// TypeScript declarations for window control API

interface WindowControl {
  startDrag: (mouseX: number, mouseY: number) => void
  moveDrag: (mouseX: number, mouseY: number, offsetX: number, offsetY: number) => void
  setIgnoreMouseEvents: (ignore: boolean) => void
  toggleVisibility: () => void
  setWindowHeight: (height: number) => void
  onDragOffset: (callback: (offset: { x: number; y: number }) => void) => void
  onFocusInput: (callback: () => void) => void
}

interface ScreenshotSelection {
  displayId: string
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

interface ScreenshotResult {
  dataUrl: string
}

interface ScreenshotControl {
  start: () => void
  captureSelection: (selection: ScreenshotSelection) => Promise<ScreenshotResult>
  cancel: () => void
  close: () => void
  onResult: (callback: (result: ScreenshotResult) => void) => () => void
}

interface Window {
  windowControl: WindowControl
  screenshot: ScreenshotControl
}
