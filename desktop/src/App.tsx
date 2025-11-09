import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import AttachmentsBar, { type Attachment } from '@/components/AttachmentsBar'
import MainBar from '@/components/MainBar'
import './App.css'

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const targetWindowHeight = useMemo(() => {
    const baseHeight = 64
    const attachmentsHeight = attachments.length > 0 ? 120 : 0
    return baseHeight + attachmentsHeight
  }, [attachments.length])

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
        return [...prev, { id, type: 'image', dataUrl }]
      })
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    window.windowControl?.setWindowHeight?.(targetWindowHeight)
  }, [targetWindowHeight])

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
    <div className="flex h-full w-full flex-col items-start justify-end space-y-1 px-2 py-2">
      <AttachmentsBar attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />
      <MainBar ref={inputRef} onMouseDown={handleMouseDown} onScreenshot={handleScreenshot} />
    </div>
  )
}

export default App
