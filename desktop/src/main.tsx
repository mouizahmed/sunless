import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ScreenshotOverlay from './components/ScreenshotOverlay.tsx'
import './index.css'

const params = new URLSearchParams(window.location.search)
const view = params.get('view')
const displayId = params.get('displayId') ?? ''
const scaleFactorParam = params.get('scaleFactor')
const parsedScaleFactor = scaleFactorParam ? Number.parseFloat(scaleFactorParam) : window.devicePixelRatio
const scaleFactor = Number.isFinite(parsedScaleFactor) && parsedScaleFactor > 0 ? parsedScaleFactor : window.devicePixelRatio

const RootComponent = view === 'screenshot'
  ? <ScreenshotOverlay displayId={displayId} scaleFactor={scaleFactor} />
  : <App />

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {RootComponent}
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
