class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.recordings = new Map()
    this.port.onmessage = ({ data }) => {
      if (data.action === 'start') {
        this.recordings.set(data.id, { chunks: [[], []], frames: 0 })
      } else if (data.action === 'stop') {
        this.finish(data.id)
      }
    }
  }
  finish(id) {
    const recording = this.recordings.get(id)
    if (!recording) return
    this.recordings.delete(id)
    this.port.postMessage({ id, recording: recording.chunks })
  }
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    for (let channel = 0; channel < output.length; channel++) {
      if (input[channel]) output[channel].set(input[channel])
      else output[channel].fill(0)
    }
    for (const [id, recording] of this.recordings) {
      const limit = sampleRate * (id === 'pad' ? 30 : 300)
      const count = Math.min(output[0].length, limit - recording.frames)
      for (let channel = 0; channel < 2; channel++) {
        recording.chunks[channel].push(output[channel].slice(0, count))
      }
      recording.frames += count
      if (recording.frames >= limit) this.finish(id)
    }
    return true
  }
}
registerProcessor('capture-output', CaptureProcessor)
