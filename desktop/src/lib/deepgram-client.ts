import type { LiveTranscriptSegment } from '@/types/live-insight'

export type DeepgramSegmentCallback = (segments: LiveTranscriptSegment[]) => void
export type DeepgramErrorCallback = (error: Error) => void
export type DeepgramStatusCallback = (status: 'connecting' | 'connected' | 'disconnected') => void

interface DeepgramWord {
  word: string
  start: number
  end: number
  confidence: number
  speaker?: number
  punctuated_word?: string
}

interface DeepgramAlternative {
  transcript: string
  confidence: number
  words: DeepgramWord[]
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[]
}

interface DeepgramResponse {
  type: string
  channel_index: number[]
  duration: number
  start: number
  is_final: boolean
  speech_final: boolean
  channel: DeepgramChannel
}

const FLUSH_INTERVAL_MS = 50
const MERGE_GAP_SECONDS = 2.5
const CONTINUATION_GAP_SECONDS = 5
const SAME_SPEAKER_HARD_GAP_SECONDS = 8
const MAX_MERGED_WORDS = 120
const INTERIM_EMIT_INTERVAL_MS = 120
const CONNECT_TIMEOUT_MS = 10000
const DELAYED_SWITCH_MAX_WORDS = 28
const DELAYED_SWITCH_MAX_GAP_MS = 15000
const INTERIM_TRAILING_WORD_WINDOW = 8
const INTERIM_MIN_DOMINANT_SHARE = 0.5
const LATE_SWITCH_SHORT_GROUP_WORDS = 4
const LATE_SWITCH_DOMINANCE_RATIO = 2.2
const INTRO_OR_ACK_CUE =
  /^(sure|yeah|yes|no|okay|ok|absolutely|definitely|right|got it|thanks)\b|(\bmy name is\b|\bi am\b|\bi'm\b)/i
const DEBUG_TRANSCRIPT_SPEAKERS = import.meta.env.DEV || import.meta.env.VITE_DEBUG_TRANSCRIPT === '1'

export class DeepgramClient {
  private ws: WebSocket | null = null
  private onSegments: DeepgramSegmentCallback
  private onError: DeepgramErrorCallback
  private onStatus: DeepgramStatusCallback

  private channel0Buffer: Int16Array[] = []
  private channel1Buffer: Int16Array[] = []
  private channel0Muted = false
  private channel1Muted = false
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private authenticated = false
  private lastInterimEmitMs = 0

  private speakerLabelMap = new Map<number, string>()
  private nextSpeakerNumber = 1
  private lastInterimSpeakerId: number | null = null

  private segmentIdCounter = 0
  private finalSegments: LiveTranscriptSegment[] = []
  private interimSegments: LiveTranscriptSegment[] = []

  constructor(opts: {
    onSegments: DeepgramSegmentCallback
    onError: DeepgramErrorCallback
    onStatus: DeepgramStatusCallback
  }) {
    this.onSegments = opts.onSegments
    this.onError = opts.onError
    this.onStatus = opts.onStatus
  }

  connect(opts: { backendWsUrl: string; idToken: string }): Promise<void> {
    this.onStatus('connecting')
    const wsUrl = new URL(opts.backendWsUrl)
    this.ws = new WebSocket(wsUrl.toString())
    this.ws.binaryType = 'arraybuffer'
    this.authenticated = false
    let handshakeDone = false

    return new Promise<void>((resolve, reject) => {
      let settled = false
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        reject(error)
      }
      const succeed = () => {
        if (settled) return
        settled = true
        resolve()
      }

      const timer = setTimeout(() => {
        fail(new Error('Timed out establishing transcription stream'))
      }, CONNECT_TIMEOUT_MS)

      this.ws!.onopen = () => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
        this.ws.send(JSON.stringify({ type: 'auth', token: opts.idToken }))
      }

      this.ws!.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const response = JSON.parse(event.data) as DeepgramResponse & { message?: string }
            if (response.type === 'auth_ok') {
              this.authenticated = true
              handshakeDone = true
              clearTimeout(timer)
              this.onStatus('connected')
              this.startFlushInterval()
              succeed()
              return
            }
            if (response.type === 'error') {
              const error = new Error(response.message ?? 'Transcription stream error')
              this.onError(error)
              if (!handshakeDone) {
                clearTimeout(timer)
                fail(error)
              }
              return
            }
            this.handleResponse(response)
          } catch {
            // Ignore malformed JSON from upstream stream events.
          }
        }
      }

      this.ws!.onerror = () => {
        const error = new Error('Deepgram WebSocket error')
        this.onError(error)
        if (!handshakeDone) {
          clearTimeout(timer)
          fail(error)
        }
      }

      this.ws!.onclose = () => {
        this.stopFlushInterval()
        this.authenticated = false
        this.onStatus('disconnected')
        if (!handshakeDone) {
          clearTimeout(timer)
          fail(new Error('Transcription stream closed before authentication'))
        }
      }
    })
  }

  sendAudio(pcmBuffer: ArrayBuffer, channel: 0 | 1) {
    const samples = new Int16Array(pcmBuffer)
    if (channel === 0) {
      this.channel0Buffer.push(this.channel0Muted ? new Int16Array(samples.length) : samples)
      return
    }
    this.channel1Buffer.push(this.channel1Muted ? new Int16Array(samples.length) : samples)
  }

  setChannelMuted(channel: 0 | 1, muted: boolean) {
    if (channel === 0) {
      this.channel0Muted = muted
      return
    }
    this.channel1Muted = muted
  }

  async close(): Promise<void> {
    this.stopFlushInterval()
    this.flushBuffers()

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(new Uint8Array(0))

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 2000)

        const originalOnMessage = this.ws!.onmessage
        this.ws!.onmessage = (event) => {
          if (originalOnMessage) {
            originalOnMessage.call(this.ws, event)
          }
        }

        const originalOnClose = this.ws!.onclose
        this.ws!.onclose = (event) => {
          clearTimeout(timeout)
          if (originalOnClose) {
            originalOnClose.call(this.ws, event)
          }
          resolve()
        }
      })

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close()
      }
    }

    this.ws = null
    this.authenticated = false
  }

  getFinalSegments(): LiveTranscriptSegment[] {
    return [...this.finalSegments]
  }

  getTranscriptText(): string {
    return this.finalSegments
      .map((s) => {
        const label = s.speakerLabel || s.speaker || 'Unknown'
        return `${label}: ${s.text}`
      })
      .join('\n')
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private startFlushInterval() {
    this.flushTimer = setInterval(() => {
      this.flushBuffers()
    }, FLUSH_INTERVAL_MS)
  }

  private stopFlushInterval() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  private flushBuffers() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) return

    const ch0 = this.concatBuffers(this.channel0Buffer)
    const ch1 = this.concatBuffers(this.channel1Buffer)
    this.channel0Buffer = []
    this.channel1Buffer = []

    if (ch0.length === 0 && ch1.length === 0) return

    const maxLen = Math.max(ch0.length, ch1.length)
    const interleaved = new Int16Array(maxLen * 2)

    for (let i = 0; i < maxLen; i++) {
      interleaved[i * 2] = i < ch0.length ? ch0[i] : 0
      interleaved[i * 2 + 1] = i < ch1.length ? ch1[i] : 0
    }

    this.ws.send(interleaved.buffer)
  }

  private concatBuffers(buffers: Int16Array[]): Int16Array {
    if (buffers.length === 0) return new Int16Array(0)
    if (buffers.length === 1) return buffers[0]

    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0)
    const result = new Int16Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
      result.set(buf, offset)
      offset += buf.length
    }
    return result
  }

  private handleResponse(response: DeepgramResponse) {
    if (response.type !== 'Results') return

    const channelIndex = response.channel_index?.[0] ?? 0
    const alt = response.channel?.alternatives?.[0]
    if (!alt) return

    const transcript = (alt.transcript ?? '').trim()
    if (!transcript) {
      if (response.is_final) {
        const before = this.interimSegments.length
        this.interimSegments = this.interimSegments.filter((s) => s.channel !== channelIndex)
        if (before !== this.interimSegments.length) {
          this.emitSegments()
        }
      }
      return
    }

    if (channelIndex === 0) {
      this.handleChannelSegment(transcript, 'user', 'You', response.is_final, 0, alt.words)
      return
    }
    this.handleDiarizedSegment(transcript, response.is_final, 1, alt.words)
  }

  private handleChannelSegment(
    transcript: string,
    speaker: string,
    speakerLabel: string,
    isFinal: boolean,
    channel: number,
    words: DeepgramWord[],
  ) {
    const startTime = words.length > 0 ? words[0].start : undefined
    const endTime = words.length > 0 ? words[words.length - 1].end : undefined

    if (isFinal) {
      this.interimSegments = this.interimSegments.filter((s) => s.channel !== channel)

      const lastFinal = this.finalSegments[this.finalSegments.length - 1]
      if (
        lastFinal &&
        lastFinal.channel === channel &&
        (lastFinal.speakerLabel || lastFinal.speaker) === speakerLabel
      ) {
        const hasTiming = startTime !== undefined && lastFinal.endTime !== undefined
        const gapSeconds = hasTiming
          ? Math.max(0, startTime - lastFinal.endTime)
          : (Date.now() - lastFinal.createdAt) / 1000

        const previousText = lastFinal.text.trim()
        const endsSentence = /[.!?]["']?$/.test(previousText)
        const startsLowercase = /^[a-z]/.test(transcript)
        const previousIsShort = previousText.split(/\s+/).length <= 14
        const looksLikeContinuation = !endsSentence || startsLowercase || previousIsShort

        const mergedWordCount =
          previousText.split(/\s+/).filter(Boolean).length +
          transcript.split(/\s+/).filter(Boolean).length

        if (
          gapSeconds <= MERGE_GAP_SECONDS ||
          (looksLikeContinuation && gapSeconds <= CONTINUATION_GAP_SECONDS) ||
          gapSeconds <= SAME_SPEAKER_HARD_GAP_SECONDS
        ) {
          if (mergedWordCount > MAX_MERGED_WORDS) {
            // Avoid creating an unbounded single bubble for very long monologues.
            const segment: LiveTranscriptSegment = {
              id: `dg-${++this.segmentIdCounter}`,
              text: transcript,
              createdAt: Date.now(),
              speaker,
              speakerLabel,
              pending: false,
              channel,
              startTime,
              endTime,
            }
            this.finalSegments.push(segment)
            this.emitSegments()
            return
          }

          lastFinal.text = `${lastFinal.text} ${transcript}`.trim()
          lastFinal.endTime = endTime ?? lastFinal.endTime
          if (lastFinal.startTime === undefined) {
            lastFinal.startTime = startTime
          }
          lastFinal.createdAt = Date.now()
          this.emitSegments()
          return
        }
      }

      const segment: LiveTranscriptSegment = {
        id: `dg-${++this.segmentIdCounter}`,
        text: transcript,
        createdAt: Date.now(),
        speaker,
        speakerLabel,
        pending: false,
        channel,
        startTime,
        endTime,
      }
      this.finalSegments.push(segment)
      if (channel === 1) {
        this.correctLikelyDelayedSpeakerSwitch()
      }
      this.emitSegments()
      return
    }

    this.interimSegments = this.interimSegments.filter((s) => s.channel !== channel)
    this.interimSegments.push({
      id: `dg-interim-ch${channel}`,
      text: transcript,
      createdAt: Date.now(),
      speaker,
      speakerLabel,
      pending: true,
      channel,
      startTime,
      endTime,
    })
    this.emitInterimSegmentsThrottled()
  }

  private handleDiarizedSegment(
    transcript: string,
    isFinal: boolean,
    channel: number,
    words: DeepgramWord[],
  ) {
    if (!isFinal) {
      const speakerId = this.pickInterimSpeaker(words)

      this.lastInterimSpeakerId = speakerId
      const label = this.getSpeakerLabel(speakerId)
      this.debugSpeaker('interim-speaker', {
        speakerId,
        label,
        words: words.length,
        textPreview: transcript.slice(0, 120),
      })
      this.handleChannelSegment(transcript, label, label, false, channel, words)
      return
    }

    this.lastInterimSpeakerId = null

    const groups: { speakerId: number; words: DeepgramWord[]; text: string }[] = []
    let currentGroup: { speakerId: number; words: DeepgramWord[]; text: string } | null = null

    for (const word of words) {
      const speakerId = word.speaker ?? 0
      if (!currentGroup || currentGroup.speakerId !== speakerId) {
        currentGroup = { speakerId, words: [], text: '' }
        groups.push(currentGroup)
      }
      currentGroup.words.push(word)
      currentGroup.text += (currentGroup.text ? ' ' : '') + (word.punctuated_word || word.word)
    }

    if (groups.length === 0) {
      this.handleChannelSegment(transcript, 'Speaker 1', 'Speaker 1', true, channel, words)
      return
    }

    // If diarization switches late, the first tiny group can be mis-attributed to the previous speaker.
    // Re-assign tiny lead-in group to the next speaker when the next group clearly dominates.
    if (groups.length >= 2) {
      const first = groups[0]
      const second = groups[1]
      const firstWords = first.words.length
      const secondWords = second.words.length
      if (
        first.speakerId !== second.speakerId &&
        firstWords > 0 &&
        firstWords <= LATE_SWITCH_SHORT_GROUP_WORDS &&
        secondWords >= Math.ceil(firstWords * LATE_SWITCH_DOMINANCE_RATIO)
      ) {
        first.speakerId = second.speakerId
      }
    }

    for (const group of groups) {
      const label = this.getSpeakerLabel(group.speakerId)
      this.debugSpeaker('final-group', {
        speakerId: group.speakerId,
        label,
        words: group.words.length,
        textPreview: group.text.slice(0, 120),
      })
      this.handleChannelSegment(group.text, label, label, true, channel, group.words)
    }
  }

  private getSpeakerLabel(speakerId: number): string {
    let label = this.speakerLabelMap.get(speakerId)
    if (!label) {
      label = `Speaker ${this.nextSpeakerNumber++}`
      this.speakerLabelMap.set(speakerId, label)
    }
    return label
  }

  private emitSegments() {
    const all = [...this.finalSegments, ...this.interimSegments]
    this.onSegments(all)
  }

  private emitInterimSegmentsThrottled() {
    const now = Date.now()
    if (now - this.lastInterimEmitMs < INTERIM_EMIT_INTERVAL_MS) return
    this.lastInterimEmitMs = now
    this.emitSegments()
  }

  private correctLikelyDelayedSpeakerSwitch() {
    const channelFinals = this.finalSegments.filter((segment) => segment.channel === 1 && !segment.pending)
    if (channelFinals.length < 3) return

    const a = channelFinals[channelFinals.length - 3]
    const b = channelFinals[channelFinals.length - 2]
    const c = channelFinals[channelFinals.length - 1]
    if (!a || !b || !c) return

    const aSpeaker = a.speakerLabel || a.speaker
    const bSpeaker = b.speakerLabel || b.speaker
    const cSpeaker = c.speakerLabel || c.speaker
    if (!aSpeaker || !bSpeaker || !cSpeaker) return

    if (aSpeaker !== bSpeaker || bSpeaker === cSpeaker) return

    const wordCount = b.text.trim().split(/\s+/).filter(Boolean).length
    if (wordCount === 0 || wordCount > DELAYED_SWITCH_MAX_WORDS) return

    const gapMs = c.createdAt - b.createdAt
    if (gapMs < 0 || gapMs > DELAYED_SWITCH_MAX_GAP_MS) return

    if (!INTRO_OR_ACK_CUE.test(b.text.trim())) return

    this.debugSpeaker('delayed-switch-correction', {
      fromSpeaker: bSpeaker,
      toSpeaker: cSpeaker,
      textPreview: b.text.slice(0, 140),
      gapMs,
      wordCount,
    })
    b.speaker = c.speaker
    b.speakerLabel = c.speakerLabel
  }

  private debugSpeaker(event: string, payload: Record<string, unknown>) {
    if (!DEBUG_TRANSCRIPT_SPEAKERS) return
    console.debug(`[transcript:${event}]`, payload)
  }

  private pickInterimSpeaker(words: DeepgramWord[]): number {
    if (words.length === 0) {
      return this.lastInterimSpeakerId ?? 0
    }

    const trailing = words.slice(-INTERIM_TRAILING_WORD_WINDOW)
    const counts = new Map<number, number>()
    let explicitCount = 0
    for (const word of trailing) {
      if (typeof word.speaker !== 'number') continue
      explicitCount++
      counts.set(word.speaker, (counts.get(word.speaker) ?? 0) + 1)
    }

    if (explicitCount === 0) {
      return this.lastInterimSpeakerId ?? 0
    }

    let dominantSpeaker = this.lastInterimSpeakerId ?? 0
    let dominantCount = -1
    for (const [speakerId, count] of counts.entries()) {
      if (count > dominantCount) {
        dominantSpeaker = speakerId
        dominantCount = count
      }
    }

    const share = dominantCount / explicitCount
    if (share < INTERIM_MIN_DOMINANT_SHARE && this.lastInterimSpeakerId !== null) {
      return this.lastInterimSpeakerId
    }
    return dominantSpeaker
  }
}
