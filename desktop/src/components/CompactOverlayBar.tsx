import type { MouseEvent as ReactMouseEvent } from 'react'
import { Grid3X3, GripVertical, Mic, MicOff, Settings, Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CompactOverlayBarProps = {
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  meetingActive: boolean
  meetingElapsedSeconds?: number
  onToggleMeeting: () => void
  micMuted: boolean
  onToggleMicMuted: () => void
  speakerMuted: boolean
  onToggleSpeakerMuted: () => void
  onOpenDashboard: () => void
  onOpenSettings: () => void
}

export default function CompactOverlayBar({
  onMouseDown,
  meetingActive,
  meetingElapsedSeconds,
  onToggleMeeting,
  micMuted,
  onToggleMicMuted,
  speakerMuted,
  onToggleSpeakerMuted,
  onOpenDashboard,
  onOpenSettings,
}: CompactOverlayBarProps) {
  const formatElapsed = (totalSeconds?: number) => {
    if (typeof totalSeconds !== 'number') return ''
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-lg bg-black/70 px-2.5 py-2 backdrop-blur-xl">
      <div className="flex items-center p-0.5" onMouseDown={onMouseDown}>
        <GripVertical className="h-4 w-4 text-white/40" />
      </div>

      <div className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="Sunless logo"
          className="h-6 w-6 rounded-md border border-white/10 bg-white/15 object-cover p-0.5"
          draggable={false}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-white">
            {meetingActive ? 'Meeting active' : 'Ready'}
          </span>
          {meetingActive && (
            <span className="text-[11px] text-white/50">
              {formatElapsed(meetingElapsedSeconds)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <Button
        type="button"
        variant={meetingActive ? 'destructive' : 'secondary'}
        className={cn(
          'h-8 rounded-full px-3 text-xs font-medium',
          meetingActive
            ? 'bg-red-500/25 text-red-50 hover:bg-red-500/30'
            : 'bg-white/20 text-white hover:bg-white/20',
        )}
        onClick={onToggleMeeting}
        title={meetingActive ? 'Stop meeting' : 'Start meeting'}
      >
        {meetingActive ? 'Stop meeting' : 'Start meeting'}
      </Button>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'h-8 w-8 shrink-0 rounded-md p-0 text-white hover:bg-white/20 hover:text-white',
            micMuted ? 'bg-red-500/20' : 'bg-white/20',
          )}
          title={micMuted ? 'Mic muted' : 'Mic unmuted'}
          aria-label="Toggle mic mute"
          onClick={onToggleMicMuted}
        >
          {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'h-8 w-8 shrink-0 rounded-md p-0 text-white hover:bg-white/20 hover:text-white',
            speakerMuted ? 'bg-red-500/20' : 'bg-white/20',
          )}
          title={speakerMuted ? 'Speaker muted' : 'Speaker unmuted'}
          aria-label="Toggle speaker mute"
          onClick={onToggleSpeakerMuted}
        >
          {speakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-md bg-white/20 p-0 text-white hover:bg-white/20 hover:text-white"
          title="Open dashboard"
          aria-label="Open dashboard"
          onClick={onOpenDashboard}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-md bg-white/20 p-0 text-white hover:bg-white/20 hover:text-white"
          title="Settings"
          aria-label="Settings"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

