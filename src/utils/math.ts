export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function dist(a: [number, number], b: [number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function angleTo(a: [number, number], b: [number, number]) {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

export function rotateTowards(
  current: number,
  target: number,
  maxDelta: number,
): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  if (Math.abs(diff) <= maxDelta) return target
  return current + Math.sign(diff) * maxDelta
}
