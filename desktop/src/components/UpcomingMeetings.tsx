import { useCallback, useEffect, useRef, useState } from 'react'

import { auth } from '@/config/firebase'
import { useAuth } from '@/contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

interface Meeting {
  id: string
  title: string
  start: string
  end: string
  location?: string
  organizer?: string
  provider: string
  is_meeting: boolean
  attendees?: string[]
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
  description?: string
  organizer?: string
  provider: string
  is_meeting: boolean
  attendees?: string[]
}

function formatMeetingDate(startTime: string) {
  const date = new Date(startTime)
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const day = date.getDate()
  return { month, day: day.toString() }
}

function formatMeetingTime(startTime: string) {
  const date = new Date(startTime)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayName} ${time}`
}

interface UpcomingMeetingsProps {
  showOnlyMeetings: boolean
}

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

export function UpcomingMeetings({ showOnlyMeetings }: UpcomingMeetingsProps) {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const cacheKey = user ? `calendar_events_${user.id}` : null

  const fetchUpcomingMeetings = useCallback(async (silent: boolean) => {
    if (!user) return

    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }

      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < POLL_INTERVAL) {
            if (!cancelledRef.current) {
              setMeetings(data)
              if (!silent) setLoading(false)
            }
            return
          }
        }
      }

      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Not authenticated')
      const idToken = await currentUser.getIdToken()

      const response = await fetch(`${API_BASE_URL}/calendar/upcoming?limit=3`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.status}`)
      }

      const data = await response.json()

      if (cancelledRef.current) return

      if (data.status === 'success' && data.events) {
        const formattedMeetings: Meeting[] = data.events.map((event: CalendarEvent) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          location: event.location,
          organizer: event.organizer,
          provider: event.provider,
          is_meeting: event.is_meeting,
          attendees: event.attendees,
        }))

        setMeetings(formattedMeetings)

        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify({ data: formattedMeetings, timestamp: Date.now() }))
        }
      } else {
        setMeetings([])
      }
    } catch (err) {
      if (!cancelledRef.current && !silent) {
        setError(err instanceof Error ? err.message : 'Failed to fetch meetings')
        setMeetings([])
      }
    } finally {
      if (!cancelledRef.current && !silent) setLoading(false)
    }
  }, [user, cacheKey])

  useEffect(() => {
    cancelledRef.current = false

    if (!user) {
      setMeetings([])
      setLoading(false)
      return
    }

    void fetchUpcomingMeetings(false)

    const interval = window.setInterval(() => {
      void fetchUpcomingMeetings(true)
    }, POLL_INTERVAL)

    return () => {
      cancelledRef.current = true
      window.clearInterval(interval)
    }
  }, [user, fetchUpcomingMeetings])

  const filteredMeetings = showOnlyMeetings
    ? meetings.filter((m) => m.is_meeting)
    : meetings

  if (loading) {
    return (
      <div className="space-y-0.5">
        {[70, 55, 80].map((w, i) => (
          <div key={i} className="flex items-start gap-2.5 px-2.5 py-2">
            <div className="flex min-w-[36px] flex-col items-center gap-1 rounded px-1.5 py-1">
              <div className="h-2 w-6 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-3 w-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" style={{ width: `${w}%` }} />
              <div className="h-2.5 w-32 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-neutral-200 p-2.5 text-center dark:border-neutral-800">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Calendar integration coming soon
        </p>
      </div>
    )
  }

  if (filteredMeetings.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 p-2.5 text-center dark:border-neutral-800">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">No upcoming events</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-0.5">
        {filteredMeetings.map((meeting) => {
          const { month, day } = formatMeetingDate(meeting.start)
          const timeString = formatMeetingTime(meeting.start)

          return (
            <div
              key={meeting.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <div className="flex min-w-[36px] flex-col items-center rounded bg-violet-600 px-1.5 py-1 text-[10px] font-medium text-white">
                <div>{month}</div>
                <div>{day}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {meeting.title}
                  </span>
                  {meeting.is_meeting && (
                    <span className="shrink-0 rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Meeting
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{timeString}</p>
                {meeting.location && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    {meeting.location}
                  </p>
                )}
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
