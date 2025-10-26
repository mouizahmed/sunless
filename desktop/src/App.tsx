import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Listen for drag offset from main process
    window.windowControl?.onDragOffset((offset) => {
      setDragOffset(offset)
    })
  }, [])

  // Global mouse move and up handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      window.windowControl?.moveDrag(e.screenX, e.screenY, dragOffset.x, dragOffset.y)
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    window.windowControl?.startDrag(e.screenX, e.screenY)
  }

  return (
    <div
      className="overlay-container"
      ref={overlayRef}
      onMouseDown={handleMouseDown}
    >
      <div className="overlay-content">
        <div className="drag-handle">
          <span className="drag-indicator">☰</span>
          <span className="title">Sunless Overlay</span>
        </div>

        <div className="status">
          <div className="status-item">
            <span className="status-label">Mode:</span>
            <span className="status-value active">Click-through</span>
          </div>
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className="status-value active">Hidden from screenshare</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
