import { Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import { getWindow, createDashboardWindow, getDashboardWindow } from './window'

let tray: Tray | null = null

function getTrayIconPath() {
  const publicDir = process.env.VITE_PUBLIC
  if (!publicDir) return null
  return path.join(publicDir, 'logo.png')
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function setupTray(options: { onQuit: () => void }) {
  if (tray) {
    return tray
  }

  const iconPath = getTrayIconPath()
  const image = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()

  // Windows tray often expects small icons; resize defensively.
  const trayImage = image.isEmpty() ? image : image.resize({ width: 16, height: 16 })

  tray = new Tray(trayImage)
  tray.setToolTip('Sunless')

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: 'Show Overlay',
        click: () => {
          const overlay = getWindow()
          const dashboard = getDashboardWindow()
          if (dashboard && !dashboard.isDestroyed()) {
            dashboard.close()
          }
          overlay?.show()
          overlay?.focus()
        },
      },
      {
        label: 'Open Dashboard',
        click: () => {
          const overlay = getWindow()
          if (overlay && !overlay.isDestroyed()) {
            overlay.hide()
          }
          const dash = createDashboardWindow()
          dash.show()
          dash.focus()
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => options.onQuit(),
      },
    ])

  tray.setContextMenu(buildMenu())

  tray.on('click', () => {
    const overlay = getWindow()
    if (!overlay) return
    if (overlay.isVisible()) {
      overlay.hide()
      return
    }
    const dashboard = getDashboardWindow()
    if (dashboard && !dashboard.isDestroyed()) {
      dashboard.show()
      dashboard.focus()
      return
    }
    overlay.show()
    overlay.focus()
  })

  return tray
}

