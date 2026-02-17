import React from 'react'
import { Grid3X3, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useWindowState } from '@/hooks/useWindowState'
import { useDashboardNotes } from '@/contexts/DashboardNotesContext'

export default function DashboardTopBar({
  onBackToOverlay,
}: {
  onBackToOverlay: () => void
}) {
  const isMacOS = window.env?.platform === 'darwin'
  const { isMaximized } = useWindowState()
  const { search, setSearch } = useDashboardNotes()

  return (
    <div
      className="relative w-full flex h-12 items-center justify-between text-sm px-2"
      style={
        {
          paddingLeft: isMacOS && !isMaximized ? '80px' : undefined,
          paddingRight: !isMacOS ? '140px' : undefined,
        } as React.CSSProperties
      }
    >
      <div
        className="absolute top-0 bottom-0 left-0 z-0"
        style={
          {
            right: isMacOS ? '0px' : '140px',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties
        }
      />
      <div className="relative z-10 flex items-center gap-2">
        <img src="./logo.png" alt="Sunless Logo" className="w-6 h-6" />
        <SidebarTrigger />

        <div
          className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Search size={12} className="text-neutral-500 dark:text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-6 w-48 border-0 bg-transparent p-0 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 dark:text-neutral-100"
          />
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-2 text-xs leading-none hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={onBackToOverlay}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Grid3X3 size={14} />
          Back to overlay
        </Button>
      </div>
    </div>
  )
}
