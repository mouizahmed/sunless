import * as React from 'react'

import { cn } from '@/lib/utils'

type InfoBannerProps = {
  children: React.ReactNode
  className?: string
}

export function InfoBanner({ children, className }: InfoBannerProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs leading-relaxed text-violet-50',
        className,
      )}
    >
      {children}
    </div>
  )
}
