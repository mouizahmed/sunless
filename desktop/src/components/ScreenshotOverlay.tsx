import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

type SelectionRect = {
  x: number
  y: number
  width: number
  height: number
}

type ScreenshotOverlayProps = {
  displayId: string
  scaleFactor: number
}

const MIN_CAPTURE_DIMENSION = 5

const formatDimensions = (width: number, height: number) => {
  return `${Math.round(width)} × ${Math.round(height)}`
}

export default function ScreenshotOverlay({ displayId, scaleFactor }: ScreenshotOverlayProps) {
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Click and drag to capture • Esc to cancel')
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const selectionRef = useRef<SelectionRect | null>(null)
  const draggingRef = useRef(false)

  const safeScaleFactor = useMemo(() => (Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : window.devicePixelRatio || 1), [scaleFactor])

  const updateSelection = useCallback((rect: SelectionRect | null) => {
    selectionRef.current = rect
    setSelection(rect)
  }, [])

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      window.screenshot.cancel()
    }
  }

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('contextmenu', handleContextMenu)

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true)
    window.removeEventListener('contextmenu', handleContextMenu)
  }
}, [])

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()

    const startX = event.clientX
    const startY = event.clientY

    originRef.current = { x: startX, y: startY }
    draggingRef.current = true
    setIsDragging(true)
    updateSelection({
      x: startX,
      y: startY,
      width: 0,
      height: 0,
    })
  }, [updateSelection])

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !originRef.current) return

    const currentX = event.clientX
    const currentY = event.clientY
    const { x: startX, y: startY } = originRef.current

    const left = Math.min(startX, currentX)
    const top = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)

    updateSelection({
      x: left,
      y: top,
      width,
      height,
    })
  }, [updateSelection])

  const finalizeSelection = useCallback(async () => {
    draggingRef.current = false
    setIsDragging(false)

    const currentSelection = selectionRef.current
    originRef.current = null
    if (!currentSelection) {
      window.screenshot.cancel()
      return
    }

    if (currentSelection.width < MIN_CAPTURE_DIMENSION || currentSelection.height < MIN_CAPTURE_DIMENSION) {
      updateSelection(null)
      window.screenshot.cancel()
      return
    }

    try {
      setStatusMessage('Capturing...')
      await window.screenshot.captureSelection({
        displayId,
        x: currentSelection.x,
        y: currentSelection.y,
        width: currentSelection.width,
        height: currentSelection.height,
        scaleFactor: safeScaleFactor,
      })
      setStatusMessage('Copied to clipboard')
    } catch (error) {
      console.error('Failed to capture screenshot', error)
      setStatusMessage('Capture failed. Press Esc to dismiss.')
      setTimeout(() => {
        window.screenshot.cancel()
      }, 1200)
    }
  }, [displayId, safeScaleFactor, updateSelection])

  useEffect(() => {
    const handleWindowMouseUp = (event: MouseEvent) => {
      if (!draggingRef.current) return
      if (event.button !== 0) return
      event.preventDefault()
      finalizeSelection()
    }

    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [finalizeSelection])

  return (
    <div
      className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      role="presentation"
    >
      {!selection && <div className="pointer-events-none absolute inset-0 bg-black/40" />}

      {selection && (
        <div
          className="pointer-events-none absolute border border-sky-400"
          style={{
            left: selection.x,
            top: selection.y,
            width: selection.width,
            height: selection.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }}
        />
      )}

      {selection && (
        <div
          className="pointer-events-none absolute rounded bg-black/70 px-2 py-1 text-xs text-white"
          style={{
            left: selection.x,
            top: Math.max(selection.y - 28, 8),
          }}
        >
          {formatDimensions(selection.width, selection.height)}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg">
        {statusMessage}
      </div>

      {isDragging && <div className="pointer-events-none absolute inset-0" />}
    </div>
  )
}

