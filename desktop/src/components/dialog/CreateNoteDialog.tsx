import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FolderRecord } from '@/types/folder'

type CreateNoteDialogProps = {
  isOpen: boolean
  folders: FolderRecord[]
  defaultFolderId?: string | null
  onClose?: () => void
  onCreate: (payload: { title: string; folderId?: string | null }) => Promise<boolean> | boolean
}

const UNFILED_VALUE = '__unfiled__'

export function CreateNoteDialog({
  isOpen,
  folders,
  defaultFolderId,
  onClose,
  onCreate,
}: CreateNoteDialogProps) {
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? UNFILED_VALUE)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle('')
    setFolderId(defaultFolderId ?? UNFILED_VALUE)
    setCreating(false)
    setError(null)
  }, [isOpen, defaultFolderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Note title is required')
      return
    }

    try {
      setCreating(true)
      setError(null)
      const ok = await onCreate({
        title: trimmed,
        folderId: folderId === UNFILED_VALUE ? null : folderId,
      })
      if (!ok) throw new Error('Failed to create note')
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-neutral-100">Create note</DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            Choose a folder and name your note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title" className="text-sm text-neutral-900 dark:text-neutral-100">
              Note title
            </Label>
            <Input
              id="note-title"
              placeholder="e.g., Meeting summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={creating}
              autoFocus
              className="h-8 text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-folder" className="text-sm text-neutral-900 dark:text-neutral-100">
              Folder
            </Label>
            <Select value={folderId} onValueChange={setFolderId} disabled={creating}>
              <SelectTrigger
                id="note-folder"
                className="h-8 border-neutral-300 bg-neutral-50 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <SelectValue placeholder="Choose a folder" />
              </SelectTrigger>
              <SelectContent className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <SelectItem value={UNFILED_VALUE}>Unfiled</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={creating}
              className="h-8 px-3 text-xs border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !title.trim()}
              className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              {creating ? 'Creating...' : 'Create note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
