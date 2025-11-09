import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import AttachmentsBar, { type Attachment } from '@/components/AttachmentsBar'
import MainBar from '@/components/MainBar'
import './App.css'

const BASE_WINDOW_HEIGHT = 60
const ATTACHMENTS_WINDOW_HEIGHT = 90

const computeWindowHeight = (attachmentCount: number) =>
  BASE_WINDOW_HEIGHT + (attachmentCount > 0 ? ATTACHMENTS_WINDOW_HEIGHT : 0)

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.windowControl?.onDragOffset((offset) => {
      setDragOffset(offset)
    })

    window.windowControl?.onFocusInput(() => {
      inputRef.current?.focus()
    })
  }, [])

  useEffect(() => {
    if (!window.screenshot?.onResult) return

    const unsubscribe = window.screenshot.onResult(({ dataUrl }) => {
      setAttachments((prev) => {
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
        return [...prev, { id, type: 'image' as const, dataUrl }]
      })
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    window.windowControl?.setWindowHeight?.(computeWindowHeight(attachments.length))
  }, [attachments.length])

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isDragging) return
      window.windowControl?.moveDrag(event.screenX, event.screenY, dragOffset.x, dragOffset.y)
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

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    window.windowControl?.startDrag(event.screenX, event.screenY)
  }

  const handleScreenshot = () => {
    try {
      window.screenshot.start()
    } catch (error) {
      console.error('Failed to start screenshot', error)
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-2">
      <div className="flex w-full flex-col items-start justify-end space-y-1.5">
        <AttachmentsBar attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />
        <MainBar ref={inputRef} onMouseDown={handleMouseDown} onScreenshot={handleScreenshot} />
      </div>
    </div>
  )
}

export default App
