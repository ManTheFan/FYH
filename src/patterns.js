export const patterns = [
  { name: 'Pocket four', meter: '4/4', steps: [[0, 2], [2], [1, 2], [2], [0, 2], [2], [1, 2], [2]] },
  { name: 'Sunday waltz', meter: '3/4', steps: [[0, 2], [2], [1, 2], [2], [3, 2], [2]] },
]
export function stepDuration(bpm) { return 30 / bpm }
