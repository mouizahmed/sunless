import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Camera, Paperclip, History, Settings, GripVertical } from 'lucide-react'
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
      className="w-full h-full flex items-center gap-2 px-3 bg-black/40 backdrop-blur-xl rounded-xl"
      ref={overlayRef}
      onMouseDown={handleMouseDown}
    >
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Ask me anything..."
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-8 text-sm"
        />
      </div>

      <div className="flex gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white"
          title="Screenshot"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white"
          title="Attach"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white"
          title="History"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <GripVertical className="h-4 w-4 text-white/40" />
    </div>
  )
}

export default App
