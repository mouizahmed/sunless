import { Button } from '@/components/ui/button'
import { CornerDownLeft, MonitorCog, Bell, GripVertical } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent } from 'react'

type SettingsPanelProps = {
  onClose: () => void
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  onLogout: () => void
  onLogoutEverywhere: () => void
}

const sections = [
  {
    key: 'behaviour',
    title: 'Behaviour',
    description: 'Control when Sunless launches and how it responds.',
    icon: MonitorCog,
    actions: [
      { label: 'Launch on Startup', hint: 'Coming soon' },
      { label: 'Global Shortcut', hint: 'Coming soon' },
    ],
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Choose how Sunless lets you know about updates.',
    icon: Bell,
    actions: [{ label: 'Desktop Alerts', hint: 'Coming soon' }],
  },
]

export default function SettingsPanel({
  onClose,
  onMouseDown,
  onLogout,
  onLogoutEverywhere,
}: SettingsPanelProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-white/10 bg-black/50 p-4 text-white backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
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
              <h2 className="text-lg font-medium text-white">
                Settings
              </h2>
            </div>
          </div>

        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 rounded-md bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 text-sm text-white/80">
        {sections.map(({ key, title, description, icon: Icon, actions }) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/50 text-white/60">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-white">
                    {title}
                  </h3>
                  <p className="text-xs text-white/60">
                    {description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {actions.map(({ label, hint }) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                >
                  {label}
                  {hint && (
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
                      {hint}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="h-px w-full bg-white/10" />

      <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-w-[12rem] bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
            onClick={onLogout}
          >
            Log out on this device
          </Button>
          <div className="h-8 w-px bg-white/15 sm:h-auto sm:self-stretch" />
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-w-[12rem] bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
            onClick={onLogoutEverywhere}
          >
            Log out everywhere
          </Button>
        </div>
      </div>
    </div>
  )
}

