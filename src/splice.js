export function fadeSplice(buffer) {
  const fadeFrames = Math.min(Math.round(buffer.sampleRate * 0.003), Math.floor(buffer.length / 2))
  if (!fadeFrames) return
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel)
    for (let frame = 0; frame < fadeFrames; frame++) {
      const gain = frame / fadeFrames
      samples[frame] *= gain
      samples[buffer.length - 1 - frame] *= gain
    }
  }
}
