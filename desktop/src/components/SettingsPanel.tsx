import { Button } from '@/components/ui/button'
import PanelBar from '@/components/PanelBar'
import { CornerDownLeft, MonitorCog, Bell, Keyboard } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'

type SettingsPanelProps = {
  onClose: () => void
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  onLogout: () => void
  onLogoutEverywhere: () => void
}

type ShortcutAction =
  | 'toggleVisibility'
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'screenshot'

type ShortcutState = {
  current: Record<ShortcutAction, string>
  defaults: Record<ShortcutAction, string>
}

type ShortcutGroup = {
  title: string
  layout?: 'two-column'
  actions: Array<{
    key: ShortcutAction
    label: string
    description: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    actions: [
      {
        key: 'toggleVisibility',
        label: 'Toggle Floating Bar',
        description: 'Show or hide the floating bar from anywhere.',
      },
    ],
  },
  {
    title: 'Window Position',
    layout: 'two-column',
    actions: [
      {
        key: 'moveUp',
        label: 'Move Up',
        description: 'Nudge the bar upward in 10% increments of the current screen.',
      },
      {
        key: 'moveDown',
        label: 'Move Down',
        description: 'Nudge the bar downward in 10% increments of the current screen.',
      },
      {
        key: 'moveLeft',
        label: 'Move Left',
        description: 'Nudge the bar left in 10% increments of the current screen.',
      },
      {
        key: 'moveRight',
        label: 'Move Right',
        description: 'Nudge the bar right in 10% increments of the current screen.',
      },
    ],
  },
  {
    title: 'Capture',
    actions: [
      {
        key: 'screenshot',
        label: 'Capture Selection',
        description: 'Open the screenshot overlay to capture part of your screen.',
      },
    ],
  },
]
const sections = [
  {
    key: 'behaviour',
    title: 'Behaviour',
    description: 'Control when the app launches and how it responds.',
    icon: MonitorCog,
    actions: [
      { label: 'Launch on Startup', hint: 'Coming soon' },
      { label: 'Global Shortcut', hint: 'Coming soon' },
    ],
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Choose how the app lets you know about updates.',
    icon: Bell,
    actions: [{ label: 'Desktop Alerts', hint: 'Coming soon' }],
  },
]

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])

function getKeyLabel(key: string) {
  if (!key) return ''

  switch (key) {
    case ' ':
    case 'Space':
    case 'Spacebar':
      return 'Space'
    case 'Escape':
      return 'Escape'
    case 'ArrowUp':
      return 'Up'
    case 'ArrowDown':
      return 'Down'
    case 'ArrowLeft':
      return 'Left'
    case 'ArrowRight':
      return 'Right'
    case 'Enter':
      return 'Enter'
    case 'Tab':
      return 'Tab'
    case 'Backspace':
      return 'Backspace'
    case 'Delete':
      return 'Delete'
    default:
      return key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1)
  }
}

function formatShortcut(event: KeyboardEvent) {
  const parts: string[] = []

  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Cmd')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const keyLabel = getKeyLabel(event.key)

  if (!keyLabel || MODIFIER_KEYS.has(event.key)) {
    return null
  }

  parts.push(keyLabel)
  return parts.join('+')
}

export default function SettingsPanel({
  onClose,
  onMouseDown,
  onLogout,
  onLogoutEverywhere,
}: SettingsPanelProps) {
  const shortcutApi = typeof window !== 'undefined' ? window.shortcutControl : undefined
  const canManageShortcuts = Boolean(shortcutApi)

  const [shortcutState, setShortcutState] = useState<ShortcutState | null>(null)
  const [isLoadingShortcuts, setIsLoadingShortcuts] = useState(() => canManageShortcuts)
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null)
  const [updatingAction, setUpdatingAction] = useState<ShortcutAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleShortcutUpdate = useCallback(
    async (action: ShortcutAction, value: string | null) => {
      if (!shortcutApi) return
      setUpdatingAction(action)
      try {
        const state = await shortcutApi.update(action, value)
        setShortcutState(state)
        setError(null)
      } catch (updateError) {
        console.error(`Failed to update shortcut for ${action}`, updateError)
        setError(
          updateError instanceof Error
            ? updateError.message
            : 'Failed to update shortcut. Please try again.',
        )
      } finally {
        setUpdatingAction(null)
      }
    },
    [shortcutApi],
  )

  useEffect(() => {
    if (!shortcutApi) return
    let isSubscribed = true
    setIsLoadingShortcuts(true)

    shortcutApi
      .getAll()
      .then((state) => {
        if (!isSubscribed) return
        setShortcutState(state)
        setError(null)
      })
      .catch((loadError) => {
        if (!isSubscribed) return
        console.error('Failed to load shortcuts', loadError)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load shortcuts. Please restart the app.',
        )
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingShortcuts(false)
        }
      })

    return () => {
      isSubscribed = false
    }
  }, [shortcutApi])

  useEffect(() => {
    if (!shortcutApi || !recordingAction) return

    const action = recordingAction

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()

      if (event.key === 'Escape') {
        setRecordingAction(null)
        return
      }

      const formatted = formatShortcut(event)

      if (!formatted) {
        return
      }

      setRecordingAction(null)

      const currentValue = shortcutState?.current?.[action]
      if (currentValue === formatted) {
        return
      }

      void handleShortcutUpdate(action, formatted)
    }

    const handleWindowBlur = () => {
      setRecordingAction(null)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [shortcutApi, recordingAction, shortcutState, handleShortcutUpdate])

  const handleRecordToggle = useCallback(
    (action: ShortcutAction) => {
      if (!canManageShortcuts || isLoadingShortcuts) return
      if (updatingAction && updatingAction !== action) return
      setError(null)
      setRecordingAction((current) => (current === action ? null : action))
    },
    [canManageShortcuts, isLoadingShortcuts, updatingAction],
  )

  const handleReset = useCallback(
    (action: ShortcutAction) => {
      if (!shortcutState) return
      const currentValue = shortcutState.current[action]
      const defaultValue = shortcutState.defaults[action]
      if (currentValue === defaultValue) return
      setRecordingAction(null)
      void handleShortcutUpdate(action, null)
    },
    [handleShortcutUpdate, shortcutState],
  )

  return (
    <div className="flex w-full flex-col gap-1.5">
      <PanelBar
        onMouseDown={onMouseDown}
        title="Settings"
        endAdornment={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-md bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
            onClick={onClose}
            title="Return to bar"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        }
      />

      <div className="attachments-scrollbar flex max-h-[420px] flex-col gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/50 p-4 text-sm text-white/80 backdrop-blur-xl">
        <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/50 text-white/60">
              <Keyboard className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-medium text-white">
                Keybinds
              </h3>
              <p className="text-xs text-white/60">
                Manage the global shortcuts registered by the floating bar.
              </p>
            </div>
          </div>

          {!canManageShortcuts ? (
            <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/60">
              Keybind controls are only available in the desktop app.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {error}
                </div>
              )}

              {isLoadingShortcuts ? (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-white/60" />
                  Loading shortcuts...
                </div>
              ) : !shortcutState ? (
                <div className="text-xs text-white/60">
                  Shortcuts are not available right now.
                </div>
              ) : (
                <>
                  {shortcutGroups.map((group) => (
                    <div key={group.title} className="flex flex-col gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                        {group.title}
                      </span>

                      <div
                        className={
                          group.layout === 'two-column'
                            ? 'grid gap-2 sm:grid-cols-2'
                            : 'flex flex-col gap-2'
                        }
                      >
                        {group.actions.map((action) => {
                          const currentValue = shortcutState.current[action.key]
                          const defaultValue = shortcutState.defaults[action.key]
                          const isRecording = recordingAction === action.key
                          const isUpdating = updatingAction === action.key
                          const recordButtonDisabled =
                            !canManageShortcuts ||
                            isLoadingShortcuts ||
                            isUpdating ||
                            (recordingAction !== null && !isRecording) ||
                            (updatingAction !== null && !isUpdating)
                          const resetDisabled =
                            !shortcutState ||
                            currentValue === defaultValue ||
                            isUpdating ||
                            Boolean(recordingAction)
                          const keyDisplayClassName = [
                            'flex flex-1 items-center gap-3 rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors',
                            isRecording
                              ? 'border-white bg-black/70 text-white'
                              : 'border-white/15 bg-black/40 text-white/80',
                            isUpdating ? 'opacity-70' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                          const displayValue = isRecording
                            ? 'Press new key combination...'
                            : currentValue || 'Not set'

                          return (
                            <div
                              key={action.key}
                              className="flex h-full flex-col gap-2 rounded-md border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">
                                  {action.label}
                                </span>
                                <span className="text-xs text-white/60">
                                  {action.description}
                                </span>
                              </div>

                              <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                                <div className={`${keyDisplayClassName} min-w-[8rem]`}>
                                  <span className="truncate">{displayValue}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="bg-white/10 text-white hover:bg-white/15 hover:text-white"
                                    disabled={recordButtonDisabled}
                                    onClick={() => handleRecordToggle(action.key)}
                                  >
                                    {isRecording ? 'Cancel' : isUpdating ? 'Saving...' : 'Record'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="text-white/80 hover:bg-white/10 hover:text-white"
                                    disabled={resetDisabled}
                                    onClick={() => handleReset(action.key)}
                                  >
                                    Reset
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <p className="text-[11px] text-white/50">
                    Press Escape to cancel while recording. Shortcuts update immediately.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {sections.map(({ key, title, description, icon: Icon, actions }) => (
          <div
            key={key}
            className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3"
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
    </div>
  )
}

