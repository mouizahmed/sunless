// TypeScript declarations for window APIs

// Authentication Result - using discriminated union for type safety
type AuthResult =
  | {
      success: true
      token?: string // Present for OAuth flows, absent for logout
    }
  | {
      success: false
      error: string
    }

// IPC Event type for Electron renderer
interface IpcRendererEvent {
  preventDefault(): void
  sender: {
    send(channel: string, ...args: unknown[]): void
  }
}

// Session update event data - using discriminated union for type safety
type AuthSessionUpdateEvent =
  | {
      success: true
      firebaseToken: string
      timestamp: string
    }
  | {
      success: false
      error: string
      timestamp: string
    }

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

interface ElectronAPI {
  // OAuth Authentication
  authenticateWithGoogle: () => Promise<AuthResult>

  // Session Management
  logout: () => Promise<AuthResult>
  logoutEverywhere: (idToken: string) => Promise<AuthResult>

  // Event listeners
  onAuthSessionUpdated: (
    callback: (
      event: IpcRendererEvent,
      data: AuthSessionUpdateEvent,
    ) => void,
  ) => () => void
}

interface Window {
  windowControl: WindowControl
  screenshot: ScreenshotControl
  electronAPI: ElectronAPI
  env: {
    platform: NodeJS.Platform
  }
}
