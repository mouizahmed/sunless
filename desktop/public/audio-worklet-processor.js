/**
 * AudioWorkletProcessor that converts Float32 audio to Int16 PCM (linear16).
 * Posts ArrayBuffer chunks via port.postMessage.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._buffer = new Float32Array(2048)
    this._bufferIndex = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const channelData = input[0]
    let i = 0

    while (i < channelData.length) {
      const remaining = this._buffer.length - this._bufferIndex
      const toCopy = Math.min(remaining, channelData.length - i)

      this._buffer.set(channelData.subarray(i, i + toCopy), this._bufferIndex)
      this._bufferIndex += toCopy
      i += toCopy

      if (this._bufferIndex >= this._buffer.length) {
        const pcm = new Int16Array(this._buffer.length)
        for (let j = 0; j < this._buffer.length; j++) {
          const s = Math.max(-1, Math.min(1, this._buffer[j]))
          pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        this.port.postMessage(pcm.buffer, [pcm.buffer])
        this._bufferIndex = 0
      }
    }

    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
