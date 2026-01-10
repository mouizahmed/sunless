import { globalShortcut, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getWindow } from './window'

const isMac = process.platform === 'darwin'

type MovementAction = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
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

export function getShortcutState() {
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
    const win = getWindow()
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(
      Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1,
    )
    const minY = currentDisplay.workArea.y
    win.setPosition(currentX, Math.max(minY, currentY - moveIncrement))
  },
  moveDown: () => {
    const win = getWindow()
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(
      Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1,
    )
    const maxY = currentDisplay.workArea.y + currentDisplay.workArea.height - win.getSize()[1]
    win.setPosition(currentX, Math.min(maxY, currentY + moveIncrement))
  },
  moveLeft: () => {
    const win = getWindow()
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(
      Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1,
    )
    const minX = currentDisplay.workArea.x
    win.setPosition(Math.max(minX, currentX - moveIncrement), currentY)
  },
  moveRight: () => {
    const win = getWindow()
    if (!win || !win.isVisible()) return
    const [currentX, currentY] = win.getPosition()
    const currentDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const moveIncrement = Math.floor(
      Math.min(currentDisplay.workAreaSize.width, currentDisplay.workAreaSize.height) * 0.1,
    )
    const maxX = currentDisplay.workArea.x + currentDisplay.workArea.width - win.getSize()[0]
    win.setPosition(Math.min(maxX, currentX + moveIncrement), currentY)
  },
}

export function registerMovementShortcuts() {
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

export function unregisterMovementShortcuts() {
  Object.keys(movementActions).forEach((action) => {
    const keybind = shortcuts[action as keyof typeof shortcuts]
    if (keybind && globalShortcut.isRegistered(keybind)) {
      globalShortcut.unregister(keybind)
      console.log(`Unregistered ${action}: ${keybind}`)
    }
  })
}

export function registerKeyboardShortcuts(
  toggleVisibilityHandler: () => void,
  screenshotHandler: () => void,
) {
  const win = getWindow()
  if (!win) return

  // Unregister all existing shortcuts first
  globalShortcut.unregisterAll()

  // Register movement shortcuts (window is visible by default)
  registerMovementShortcuts()

  // Register toggle visibility shortcut (always active)
  if (shortcuts.toggleVisibility) {
    try {
      globalShortcut.register(shortcuts.toggleVisibility, toggleVisibilityHandler)
      console.log(`Registered toggleVisibility: ${shortcuts.toggleVisibility}`)
    } catch (error) {
      console.error(`Failed to register toggleVisibility (${shortcuts.toggleVisibility}):`, error)
    }
  }

  if (screenshotShortcut) {
    try {
      globalShortcut.register(screenshotShortcut, screenshotHandler)
      console.log(`Registered full-screen screenshot: ${screenshotShortcut}`)
    } catch (error) {
      console.error(`Failed to register full-screen screenshot (${screenshotShortcut}):`, error)
    }
  }
}

export function updateShortcut(payload: ShortcutUpdatePayload) {
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

  const win = getWindow()
  const windowVisible = Boolean(win?.isVisible())

  const shouldValidate =
    action === 'screenshot' ||
    action === 'toggleVisibility' ||
    windowVisible

  if (shouldValidate) {
    const isRegistered = globalShortcut.isRegistered(nextShortcut)

    if (!isRegistered) {
      // Revert changes
      if (action === 'screenshot') {
        screenshotShortcut = previousShortcut
      } else if (previousShortcut) {
        shortcuts = {
          ...shortcuts,
          [action]: previousShortcut,
        }
      }

      throw new Error(`Failed to register shortcut: ${nextShortcut}`)
    }
  }

  const nextState = getShortcutState()
  writePersistedShortcuts(nextState.current)

  return nextState
}

