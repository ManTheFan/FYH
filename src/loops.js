export const records = [
  { title: 'Pocket Break', style: 'Boom bap', bpm: 94, color: '#f4b752', seed: 17,
    kick: [0, 3, 8, 10, 16, 19, 24, 27], snare: [4, 12, 20, 28, 31], hats: [0, 2, 4, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 23, 24, 26, 28, 30], swing: 0.19, tone: 49 },
  { title: 'Night Circuit', style: 'House', bpm: 124, color: '#b8db86', seed: 43,
    kick: [0, 4, 8, 12, 16, 20, 24, 28], snare: [4, 12, 20, 28], hats: [2, 6, 10, 14, 15, 18, 22, 26, 30, 31], swing: 0, tone: 57 },
  { title: 'Soft Static', style: 'Broken beat', bpm: 108, color: '#eaa5d1', seed: 79,
    kick: [0, 6, 10, 15, 16, 22, 26, 30], snare: [4, 11, 20, 27, 29], hats: [1, 3, 5, 8, 9, 13, 17, 19, 21, 24, 25, 29, 31], swing: 0.28, tone: 43 },
]

export function renderLoop(record, sampleRate) {
  const stepSeconds = 60 / record.bpm / 4
  const samples = new Float32Array(Math.round(stepSeconds * 32 * sampleRate))
  let seed = record.seed
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2147483648 - 1
  }

  function hit(step, duration, voice) {
    const start = Math.round((step + (step % 2) * record.swing) * stepSeconds * sampleRate)
    let previousNoise = 0
    for (let i = 0; i < duration * sampleRate; i++) {
      const t = i / sampleRate
      const currentNoise = noise()
      const fade = Math.min(1, t / 0.002, (duration - t) / 0.008)
      samples[(start + i) % samples.length] += fade * voice(t, currentNoise, currentNoise - previousNoise)
      previousNoise = currentNoise
    }
  }

  for (const step of record.kick) {
    hit(step, 0.24, (t) => 0.78 * Math.sin(2 * Math.PI *
      (record.tone * t + 2.6 * (1 - Math.exp(-45 * t)))) * Math.exp(-15 * t))
  }
  for (const step of record.snare) {
    const accent = step % 4 === 0 ? 1 : 0.36
    hit(step, 0.17, (t, n, high) => accent * (
      (0.19 * n + 0.12 * high) * Math.exp(-25 * t) +
      0.25 * Math.sin(2 * Math.PI * record.tone * 3.5 * t) * Math.exp(-36 * t)))
  }
  for (const step of record.hats) {
    const open = record.bpm === 124 && step % 4 === 2
    hit(step, open ? 0.16 : 0.055, (t, _, high) =>
      high * (step % 2 === 0 ? 0.16 : 0.085) * Math.exp(-(open ? 25 : 80) * t))
  }
  for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i])
  return samples
}
