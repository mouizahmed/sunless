import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type MessageRole = 'user' | 'assistant' | 'system'

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole
}

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full justify-end py-1.5',
      from === 'user' ? 'is-user justify-end' : 'is-assistant justify-start',
      className,
    )}
    {...props}
  />
)

export type MessageContentProps = HTMLAttributes<HTMLDivElement>

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      'max-w-[80%] rounded-lg px-4 py-3 text-foreground text-sm shadow-[0_4px_12px_rgba(0,0,0,0.35)]',
      'group-[.is-user]:bg-white group-[.is-user]:text-black',
      'group-[.is-assistant]:bg-white/5 group-[.is-assistant]:text-white',
      className,
    )}
    {...props}
  >
    <div className="is-user:dark">{children}</div>
  </div>
)
