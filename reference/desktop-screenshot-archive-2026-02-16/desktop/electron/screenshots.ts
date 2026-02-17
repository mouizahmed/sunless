import { BrowserWindow, screen, desktopCapturer, clipboard } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getWindow, VITE_DEV_SERVER_URL, RENDERER_DIST } from './window'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let screenshotWin: BrowserWindow | null = null
let shouldRestoreMainWindowAfterScreenshot = false
let isCapturingFullScreenshot = false

export function closeScreenshotWindow() {
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
  const alwaysOnTopLevel =
    process.platform === 'darwin' || process.platform === 'win32'
      ? 'screen-saver'
      : 'floating'
  screenshotWin.setAlwaysOnTop(true, alwaysOnTopLevel)

  screenshotWin.on('closed', () => {
    screenshotWin = null
    const win = getWindow()
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

export function startScreenshotCapture() {
  const cursorPoint = screen.getCursorScreenPoint()
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint)
  if (!targetDisplay) return

  if (screenshotWin && !screenshotWin.isDestroyed()) {
    screenshotWin.focus()
    return
  }

  const win = getWindow()
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

export async function captureAllDisplays(): Promise<boolean> {
  const displays = screen.getAllDisplays()
  if (displays.length === 0) {
    return false
  }

  if (screenshotWin && !screenshotWin.isDestroyed()) {
    closeScreenshotWindow()
  }

  const results: Array<{
    image: Electron.NativeImage
    dataUrl: string
    displayId: string
  }> = []

  try {
    for (const display of displays) {
      const displayIdString = String(display.id)
      const physicalWidth = Math.max(
        1,
        Math.round(display.bounds.width * display.scaleFactor),
      )
      const physicalHeight = Math.max(
        1,
        Math.round(display.bounds.height * display.scaleFactor),
      )

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: physicalWidth,
          height: physicalHeight,
        },
      })

      const source = sources.find((candidate) => {
        if (candidate.display_id === displayIdString) return true
        const idSegments = candidate.id.split(':')
        return idSegments.includes(displayIdString)
      })

      if (!source) {
        console.warn(`Full capture: display ${displayIdString} has no matching source`)
        continue
      }

      const image = source.thumbnail

      if (image.isEmpty()) {
        console.warn(`Full capture: display ${displayIdString} returned empty thumbnail`)
        continue
      }

      const pngBuffer = image.toPNG()
      if (!pngBuffer || pngBuffer.length === 0) {
        console.warn(`Full capture: display ${displayIdString} produced empty PNG buffer`)
        continue
      }

      results.push({
        image,
        dataUrl: `data:image/png;base64,${pngBuffer.toString('base64')}`,
        displayId: displayIdString,
      })
    }

    if (results.length === 0) {
      return false
    }

    clipboard.writeImage(results[0].image)

    const win = getWindow()
    for (const result of results) {
      win?.webContents.send('screenshot-result', {
        dataUrl: result.dataUrl,
        displayId: result.displayId,
      })
    }

    return true
  } catch (error) {
    console.error('Failed to capture full-screen screenshot', error)
    return false
  }
}

export async function handleFullScreenshotShortcut() {
  if (isCapturingFullScreenshot) {
    return
  }

  isCapturingFullScreenshot = true
  let success = false

  const win = getWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('screenshot-full-start')
  }

  try {
    success = await captureAllDisplays()
  } finally {
    if (win && !win.isDestroyed()) {
      win.webContents.send('screenshot-full-complete', { success })
    }
    isCapturingFullScreenshot = false
  }
}

export async function captureScreenSelection(payload: {
  displayId: string
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}) {
  const { displayId, x, y, width, height, scaleFactor } = payload

  if (width <= 0 || height <= 0) {
    throw new Error('Invalid capture dimensions')
  }

  const targetDisplay = screen.getAllDisplays().find(
    (display) => String(display.id) === String(displayId),
  )
  if (!targetDisplay) {
    throw new Error(`Display ${displayId} not found`)
  }

  const effectiveScaleFactor = scaleFactor > 0 ? scaleFactor : targetDisplay.scaleFactor || 1
  const captureWidth = Math.max(
    1,
    Math.round(targetDisplay.bounds.width * targetDisplay.scaleFactor),
  )
  const captureHeight = Math.max(
    1,
    Math.round(targetDisplay.bounds.height * targetDisplay.scaleFactor),
  )

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
  const win = getWindow()
  win?.webContents.send('screenshot-result', { dataUrl })

  setImmediate(() => {
    closeScreenshotWindow()
  })

  return { dataUrl }
}

