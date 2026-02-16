import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import DashboardWorkspace from '@/components/DashboardWorkspace'
import DashboardTopBar from '@/components/DashboardTopBar'
import DashboardSidebar from '@/components/DashboardSidebar'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { DashboardNotesProvider } from '@/contexts/DashboardNotesContext'
import { useEffect, useMemo, useRef } from 'react'
import { useDashboardNotes } from '@/contexts/DashboardNotesContext'

function useDashboardNoteIdFromUrl() {
  return useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const noteId = params.get('noteId')
    return noteId && noteId.trim() ? noteId.trim() : null
  }, [])
}

function DashboardNoteSelector({ initialNoteId }: { initialNoteId: string | null }) {
  const { notes, selectNote } = useDashboardNotes()
  const initialAppliedRef = useRef(false)

  useEffect(() => {
    if (initialAppliedRef.current) return
    if (!initialNoteId) return
    const exists = notes.some((n) => n.id === initialNoteId)
    if (exists) {
      selectNote(initialNoteId)
      initialAppliedRef.current = true
    }
  }, [initialNoteId, notes, selectNote])

  useEffect(() => {
    const handler = (_event: unknown, payload?: { noteId?: string }) => {
      const noteId = typeof payload?.noteId === 'string' ? payload.noteId : ''
      if (!noteId) return
      selectNote(noteId)
    }

    window.ipcRenderer?.on('dashboard:select-note', handler)
    return () => {
      window.ipcRenderer?.off('dashboard:select-note', handler)
    }
  }, [selectNote])

  return null
}

function DashboardContent() {
  const { user, isLoading } = useAuth()
  const { isOpen } = useSidebar()
  const initialNoteId = useDashboardNoteIdFromUrl()

  if (isLoading) return null

  return (
    <DashboardNotesProvider userId={user?.id}>
      <DashboardNoteSelector initialNoteId={initialNoteId} />
      <div className="h-screen w-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
          <DashboardTopBar onBackToOverlay={() => window.dashboard?.close?.()} />

          <div className={`flex h-full min-h-0 p-2 ${isOpen ? 'gap-2' : ''}`}>
            <DashboardSidebar />
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden select-none">
              <DashboardWorkspace userId={user?.id} />
            </div>
          </div>
        </div>
      </div>
    </DashboardNotesProvider>
  )
}

export default function DashboardApp() {
  return (
    <AuthProvider>
      <SidebarProvider defaultOpen={true}>
        <DashboardContent />
      </SidebarProvider>
    </AuthProvider>
  )
}
