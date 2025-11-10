import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { GripVertical, Loader2 } from 'lucide-react'

type WelcomeProps = {
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
}

const AUTH_BUTTON_CLASSES =
  'h-9 w-full rounded-md border border-white/15 bg-white/10 px-4 text-sm font-medium text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.85)] transition hover:bg-white/20 hover:text-white focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60'

const Welcome = forwardRef<HTMLDivElement, WelcomeProps>(function Welcome({ onMouseDown }, ref) {
  const {
    authError,
    loginLoading,
    loginProvider,
    loginWithGoogle,
    cancelAuth,
  } = useAuth()

  const isWaitingForBrowser = loginLoading && loginProvider

  return (
    <div ref={ref} className="flex w-full items-center justify-center">
      <div className="flex w-full max-w-xl flex-col gap-4 rounded-xl border border-white/10 bg-black/50 p-4 text-white backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center rounded-md bg-white/5 p-1 text-white/40 hover:text-white/70"
              onMouseDown={onMouseDown}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
                Sunless
              </span>
              <span className="text-sm text-white/70">
                Sign in to keep the floating bar ready.
              </span>
            </div>
          </div>
          <img
            src="/logo.png"
            alt="Sunless logo"
            className="h-6 w-6 rounded-md border border-white/10 bg-white/5 object-cover p-0.5"
            draggable={false}
          />
        </div>

        {!isWaitingForBrowser && (
          <p className="text-sm text-white/60">
            Link your account to sync attachments, history, and settings across every Sunless window.
          </p>
        )}

        {authError && (
          <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {authError}
          </div>
        )}

        {isWaitingForBrowser && (
          <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-white/60" />
            <span className="flex-1">
              Complete authentication in your browser, then return to Sunless.
            </span>
          </div>
        )}

        {!isWaitingForBrowser && (
          <Button
            variant="outline"
            className={cn(
              AUTH_BUTTON_CLASSES,
              loginLoading ? 'cursor-wait' : 'cursor-pointer',
            )}
            onClick={loginWithGoogle}
            disabled={loginLoading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        )}

        {isWaitingForBrowser && (
          <Button
            variant="ghost"
            className="w-full text-xs font-medium text-white/60 hover:text-white/80"
            onClick={cancelAuth}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
})

export default Welcome

