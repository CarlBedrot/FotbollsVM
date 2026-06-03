import { MAX_POINTS } from '../domain/rules';

/** Horizontal position (% from left) of a horse on the track. 0p→0%, max→92% (8% reserved for the finish). */
export function progressPercent(points: number, max: number = MAX_POINTS): number {
  const clamped = Math.max(0, Math.min(points, max));
  return Math.round((clamped / max) * 92);
}
