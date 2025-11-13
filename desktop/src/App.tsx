import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AttachmentsBar, { type Attachment } from '@/components/AttachmentsBar'
import MainBar from '@/components/MainBar'
import SettingsPanel from '@/components/SettingsPanel'
import Welcome from '@/components/Welcome'
import './App.css'

const WINDOW_VERTICAL_PADDING = 16
const MAX_APP_HEIGHT = 520

function AppContent() {
  const { user, isLoading, logout, logoutEverywhere } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null)
  const [activePanel, setActivePanel] = useState<'main' | 'settings'>('main')
  const inputRef = useRef<HTMLInputElement>(null)

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    setContentEl(node)
  }, [])

  const createAttachment = useCallback((init: Omit<Attachment, 'id'>): Attachment => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    return {
      id,
      ...init,
    }
  }, [])

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
      setAttachments((prev) => [
        ...prev,
        createAttachment({
          kind: 'image',
          dataUrl,
          mimeType: 'image/png',
          source: 'screenshot',
        }),
      ])
    })

    return () => {
      unsubscribe?.()
    }
  }, [createAttachment])

  useLayoutEffect(() => {
    if (!contentEl) return

    const updateHeight = () => {
      const contentHeight = Math.min(contentEl.scrollHeight, MAX_APP_HEIGHT)
      const height = contentHeight + WINDOW_VERTICAL_PADDING
      window.windowControl?.setWindowHeight?.(height)
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      updateHeight()
    })

    observer.observe(contentEl)

    return () => {
      observer.disconnect()
    }
  }, [contentEl])

  useEffect(() => {
    if (user) {
      setActivePanel('main')
    }
  }, [user])

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

  const handleAttach = useCallback(async () => {
    try {
      const picker = window.attachments?.pickFiles
      if (!picker) {
        console.warn('Attachment picker is not available')
        return
      }

      const selected = await picker()
      if (!selected || selected.length === 0) {
        return
      }

      setAttachments((prev) => [
        ...prev,
        ...selected.map((item) =>
          createAttachment({
            kind: item.kind,
            dataUrl: item.dataUrl,
            mimeType: item.mimeType,
            name: item.name,
            size: item.size,
            filePath: item.filePath,
            source: 'picker',
          }),
        ),
      ])
    } catch (error) {
      console.error('Failed to attach files', error)
    }
  }, [createAttachment])

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }

  // Show nothing while loading auth state
  if (isLoading) {
    return null
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-2">
      {user ? (
        <div
          ref={contentRef}
          style={{ maxHeight: MAX_APP_HEIGHT }}
          className="flex w-full flex-col items-stretch gap-1.5 overflow-hidden"
        >
          {activePanel === 'settings' ? (
            <SettingsPanel
              onClose={() => setActivePanel('main')}
              onMouseDown={handleMouseDown}
              onLogout={logout}
              onLogoutEverywhere={logoutEverywhere}
            />
          ) : (
            <>
              <AttachmentsBar attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />
              <MainBar
                ref={inputRef}
                onMouseDown={handleMouseDown}
                onScreenshot={handleScreenshot}
                onAttach={handleAttach}
                onOpenSettings={() => setActivePanel('settings')}
              />
            </>
          )}
        </div>
      ) : (
        <Welcome onMouseDown={handleMouseDown} ref={contentRef} />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
