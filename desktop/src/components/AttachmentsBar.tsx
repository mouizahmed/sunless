import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export type Attachment = {
  id: string
  type: 'image'
  dataUrl: string
}

type AttachmentsBarProps = {
  attachments: Attachment[]
  onRemoveAttachment: (id: string) => void
}

export default function AttachmentsBar({ attachments, onRemoveAttachment }: AttachmentsBarProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div
      className="attachments-scrollbar flex max-w-full items-end justify-start gap-1.5 overflow-x-auto pl-1 pr-3 pt-2 pb-1"
      onWheel={(event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault()
          event.currentTarget.scrollBy({
            left: event.deltaY,
            behavior: 'auto',
          })
        }
      }}
    >
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative shrink-0 rounded-lg border border-white/15 bg-black/70 p-1.5 shadow-lg backdrop-blur-md"
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
        >
          <div className="relative h-16 w-16 overflow-hidden rounded-md bg-black/40">
            <img
              src={attachment.dataUrl}
              alt="Screenshot attachment"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <Button
            type="button"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/90 p-0 text-white/80 hover:bg-black hover:text-white"
            onClick={(event) => {
              event.stopPropagation()
              onRemoveAttachment(attachment.id)
            }}
          >
            <X className="h-3 w-3 text-red-400" />
          </Button>
        </div>
      ))}
    </div>
  )
}

