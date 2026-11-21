class VinylProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.head = 0
    this.rate = 0
    this.targetRate = 1
    this.gain = 0
    this.smoothing = 1 - Math.exp(-1 / (sampleRate * 0.008))
    this.recovery = 1 - Math.exp(-1 / (sampleRate * 0.065))
    this.released = true
    this.position = 0
    this.reportFrames = 0

    this.port.onmessage = ({ data }) => {
      if (data.seek === 'start' || data.seek === 'position') {
        if (data.finishRecording && this.recording) {
          this.port.postMessage({ recording: this.recording, final: false, reason: 'seek' })
          this.recording = null
          this.recordedFrames = 0
        }
        this.seekTarget = { fraction: data.seek === 'start' ? 0 : Math.max(0, Math.min(1, data.fraction)), id: data.id }
      } else if (data.record === 'start') {
        this.recording = [[], []]
        this.recordedFrames = 0
        this.recordPaused = Boolean(data.paused)
      } else if (data.record === 'wait') {
        this.recording = null
        this.recordedFrames = 0
      } else if (data.record === 'splice' || data.record === 'stop') {
        if (this.recording) {
          this.port.postMessage({ recording: this.recording, final: data.record === 'stop' })
          this.recording = data.record === 'splice' ? [[], []] : null
          this.recordedFrames = 0
        } else if (data.record === 'stop') {
          this.port.postMessage({ recording: [[], []], final: true })
        }
      } else if (data.samples) {
        if (this.samples) this.nextSamples = data.samples
        else this.samples = data.samples
      } else {
        this.targetRate = data.rate
        this.released = data.released
        if (data.recordPaused !== undefined) this.recordPaused = data.recordPaused
      }
    }
  }

  process(_inputs, [output]) {
    if (!this.samples) return true
    const smoothing = this.released ? this.recovery : this.smoothing
    for (let i = 0; i < output[0].length; i++) {
      this.rate += (this.targetRate - this.rate) * smoothing
      if (this.targetRate === 0 && Math.abs(this.rate) < 0.001) this.rate = 0
      const targetGain = this.nextSamples || this.seekTarget ? 0 : Math.min(1, Math.abs(this.rate) * 12)
      this.gain += (targetGain - this.gain) * this.smoothing
      if (this.nextSamples && this.gain < 0.001) {
        this.samples = this.nextSamples
        this.nextSamples = null
        this.head = 0
        this.position = 0
      } else if (this.seekTarget && this.gain < 0.001) {
        const target = this.seekTarget
        this.head = target.fraction * (this.samples[0].length - 1)
        this.position = this.head
        this.seekTarget = null
        this.port.postMessage({ position: this.position, head: this.head, length: this.samples[0].length, rate: this.rate, audioTime: currentTime + i / sampleRate, seekId: target.id })
      }

      const length = this.samples[0].length
      const index = Math.floor(this.head)
      for (let channel = 0; channel < output.length; channel++) {
        const samples = this.samples[Math.min(channel, this.samples.length - 1)]
        const from = samples[index]
        const to = samples[(index + 1) % length]
        output[channel][i] = (from + (to - from) * (this.head - index)) * this.gain * 0.8
      }

      // Signed rate advances the same fractional playhead in either direction.
      this.head = (this.head + this.rate + length) % length
      this.position += this.rate
    }
    if (this.recording && !this.recordPaused && this.recordedFrames < sampleRate * 30) {
      const count = Math.min(output[0].length, sampleRate * 30 - this.recordedFrames)
      for (let channel = 0; channel < 2; channel++) {
        this.recording[channel].push(output[channel].slice(0, count))
      }
      this.recordedFrames += count
      if (this.recordedFrames >= sampleRate * 30) {
        this.port.postMessage({ recording: this.recording, final: true, limit: true })
        this.recording = null
      }
    }
    this.reportFrames += output[0].length
    if (this.reportFrames >= 1024) {
      this.reportFrames = 0
      this.port.postMessage({ position: this.position, head: this.head, length: this.samples[0].length, rate: this.rate, audioTime: currentTime + output[0].length / sampleRate })
    }
    return true
  }
}

registerProcessor('vinyl-player', VinylProcessor)
