export type NoteRecord = {
  id: string
  title: string
  folderId?: string
  noteMarkdown: string
  overviewJson?: string
  createdAt: number
  updatedAt: number
}

export type OverviewData = {
  summary: string
  action_items: string[]
  email_draft: string
  message_draft: string
}

export type NoteVersion = {
  id: string
  note_id: string
  note_markdown: string
  created_at: string
}
