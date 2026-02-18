import { type CSSProperties, useState } from 'react'

import { FileText, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { UpcomingMeetings } from '@/components/UpcomingMeetings'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardNotes, excerpt } from '@/contexts/DashboardNotesContext'

function relativeTime(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardHome() {
  const { user } = useAuth()
  const { notes, selectNote, createNewNote } = useDashboardNotes()
  const [showOnlyMeetings, setShowOnlyMeetings] = useState(false)

  if (!user) return null

  const recentNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Coming Up */}
      <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Coming up
          </h2>
          <Button
            onClick={() => setShowOnlyMeetings(!showOnlyMeetings)}
            variant="ghost"
            size="sm"
            className="h-6 rounded-md px-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
          >
            {showOnlyMeetings ? 'Show All' : 'Meetings Only'}
          </Button>
        </div>
        <UpcomingMeetings showOnlyMeetings={showOnlyMeetings} />
      </div>

      {/* Recent Activity */}
      <div className="flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-2.5 py-2 dark:border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Recent Activity
          </h2>
          <Button
            onClick={() => void createNewNote()}
            size="sm"
            className="h-7 gap-1.5 bg-violet-600 px-2 text-xs text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New note
          </Button>
        </div>

        <div className="overflow-y-auto p-1 sidebar-scrollbar">
          {recentNotes.length > 0 ? (
            <div className="space-y-0.5">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => selectNote(note.id)}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {note.title || 'Untitled'}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                        {relativeTime(note.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {excerpt(note.noteMarkdown)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-2.5 py-2 text-xs text-neutral-500 dark:text-neutral-400">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
