import { forwardRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Camera, Paperclip, History, Settings, GripVertical } from 'lucide-react'

type MainBarProps = {
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  onScreenshot: () => void
}

const MainBar = forwardRef<HTMLInputElement, MainBarProps>(function MainBar({ onMouseDown, onScreenshot }, inputRef) {
  return (
    <div
      className="flex h-12 w-full items-center gap-2 rounded-xl bg-black/40 px-3 backdrop-blur-xl"
      onMouseDown={onMouseDown}
    >
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Ask me anything..."
          className="h-8 bg-white/10 text-sm text-white placeholder:text-white/50"
        />
      </div>

      <div className="flex gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          title="Screenshot"
          onClick={onScreenshot}
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          title="Attach"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          title="History"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <GripVertical className="h-4 w-4 text-white/40" />
    </div>
  )
})

export default MainBar

