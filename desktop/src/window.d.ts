// TypeScript declarations for window control API

interface WindowControl {
  startDrag: (mouseX: number, mouseY: number) => void
  moveDrag: (mouseX: number, mouseY: number, offsetX: number, offsetY: number) => void
  setIgnoreMouseEvents: (ignore: boolean) => void
  toggleVisibility: () => void
  onDragOffset: (callback: (offset: { x: number; y: number }) => void) => void
}

interface Window {
  windowControl: WindowControl
}
