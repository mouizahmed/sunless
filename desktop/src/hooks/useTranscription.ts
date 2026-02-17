import { useCallback, useEffect, useRef, useState } from 'react'
import { auth } from '@/config/firebase'
import { DeepgramClient } from '@/lib/deepgram-client'
import { startMicCapture, startSystemAudioCapture, type AudioCaptureHandle } from '@/lib/audio-capture'
import type { LiveTranscriptSegment } from '@/types/live-insight'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
const TRANSCRIPTION_WS_URL = (() => {
  const httpUrl = new URL(`${API_BASE_URL.replace(/\/+$/, '')}/transcription/stream`)
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return httpUrl.toString()
})()
const MAX_DISPLAY_SEGMENTS = 500
const MAX_RECONNECT_ATTEMPTS = 8
const MAX_RECONNECT_DELAY_MS = 15000
const RECONNECT_JITTER_MS = 400

type TranscriptionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'

interface UseTranscriptionOptions {
  enabled: boolean
  micMuted: boolean
  speakerMuted: boolean
  onError?: (error: Error) => void
}

interface UseTranscriptionResult {
  segments: LiveTranscriptSegment[]
  status: TranscriptionStatus
  finalTranscriptText: string
}

export function useTranscription({
  enabled,
  micMuted,
  speakerMuted,
  onError,
}: UseTranscriptionOptions): UseTranscriptionResult {
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([])
  const [status, setStatus] = useState<TranscriptionStatus>('idle')

  const deepgramRef = useRef<DeepgramClient | null>(null)
  const micHandleRef = useRef<AudioCaptureHandle | null>(null)
  const systemHandleRef = useRef<AudioCaptureHandle | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabledRef = useRef(enabled)
  const finalTextRef = useRef('')

  enabledRef.current = enabled

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (micHandleRef.current) {
      micHandleRef.current.stop()
      micHandleRef.current = null
    }
    if (systemHandleRef.current) {
      systemHandleRef.current.stop()
      systemHandleRef.current = null
    }
    if (deepgramRef.current) {
      void deepgramRef.current.close()
      deepgramRef.current = null
    }
  }, [])

  const startSession = useCallback(async () => {
    cleanup()
    setStatus('connecting')

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Not authenticated')
      }
      const idToken = await currentUser.getIdToken()

      // Create realtime transcription client via backend websocket proxy
      const client = new DeepgramClient({
        onSegments: (segs) => {
          // Limit display segments for memory
          const display = segs.length > MAX_DISPLAY_SEGMENTS ? segs.slice(-MAX_DISPLAY_SEGMENTS) : segs
          setSegments(display)
        },
        onError: (err) => {
          console.error('Deepgram error:', err)
          onError?.(err)
        },
        onStatus: (dgStatus) => {
          if (dgStatus === 'connected') {
            setStatus('connected')
            reconnectAttemptRef.current = 0
          } else if (dgStatus === 'disconnected') {
            // Attempt reconnect if still enabled
            if (enabledRef.current && reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
              const exponentialDelay = Math.pow(2, reconnectAttemptRef.current) * 1000
              const baseDelay = Math.min(exponentialDelay, MAX_RECONNECT_DELAY_MS)
              const jitter = Math.floor(Math.random() * RECONNECT_JITTER_MS)
              const delay = baseDelay + jitter
              reconnectAttemptRef.current++
              setStatus('connecting')
              reconnectTimerRef.current = setTimeout(() => {
                if (enabledRef.current) {
                  void startSession()
                }
              }, delay)
            } else if (enabledRef.current) {
              setStatus('error')
            }
          }
        },
      })

      deepgramRef.current = client
      await client.connect({ backendWsUrl: TRANSCRIPTION_WS_URL, idToken })

      // Start mic capture
      try {
        const micHandle = await startMicCapture((pcmBuffer) => {
          client.sendAudio(pcmBuffer, 0)
        })
        micHandleRef.current = micHandle
        if (micMuted) micHandle.mute()
      } catch (err) {
        console.error('Mic capture failed:', err)
        onError?.(new Error('Microphone access denied or unavailable'))
      }

      // Start system audio capture
      try {
        const systemHandle = await startSystemAudioCapture((pcmBuffer) => {
          client.sendAudio(pcmBuffer, 1)
        })
        systemHandleRef.current = systemHandle
        if (speakerMuted) systemHandle.mute()
      } catch (err) {
        console.warn('System audio capture unavailable:', err)
      }
    } catch (err) {
      console.error('Failed to start transcription session:', err)
      setStatus('error')
      onError?.(err instanceof Error ? err : new Error('Failed to start transcription'))
    }
  }, [cleanup, micMuted, speakerMuted, onError])

  // Start/stop based on enabled
  useEffect(() => {
    if (enabled) {
      void startSession()
    } else {
      // Build final transcript text before cleanup
      if (deepgramRef.current) {
        finalTextRef.current = deepgramRef.current.getTranscriptText()
      }
      cleanup()
      setStatus('idle')
    }

    return () => {
      if (deepgramRef.current) {
        finalTextRef.current = deepgramRef.current.getTranscriptText()
      }
      cleanup()
    }
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // React to mic mute changes
  useEffect(() => {
    if (micHandleRef.current) {
      if (micMuted) {
        micHandleRef.current.mute()
      } else {
        micHandleRef.current.unmute()
      }
    }
    if (deepgramRef.current) {
      deepgramRef.current.setChannelMuted(0, micMuted)
    }
  }, [micMuted])

  // React to speaker mute changes
  useEffect(() => {
    if (systemHandleRef.current) {
      if (speakerMuted) {
        systemHandleRef.current.mute()
      } else {
        systemHandleRef.current.unmute()
      }
    }
    if (deepgramRef.current) {
      deepgramRef.current.setChannelMuted(1, speakerMuted)
    }
  }, [speakerMuted])

  return {
    segments,
    status,
    finalTranscriptText: finalTextRef.current,
  }
}
