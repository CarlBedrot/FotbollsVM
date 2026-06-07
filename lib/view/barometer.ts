import { MAX_POINTS } from '../domain/rules';

/** Horizontal position (% from left) of a horse on the track. 0p→0%, max→92% (8% reserved for the finish). */
export function progressPercent(points: number, max: number = MAX_POINTS): number {
  const clamped = Math.max(0, Math.min(points, max));
  return Math.round((clamped / max) * 92);
}

/** Fraction (0..1) of the rail a horse has covered, derived from its points. */
export function railFraction(points: number, max: number = MAX_POINTS): number {
  return progressPercent(points, max) / 92;
}

/** CSS `left` value for a runner at the given rail fraction (0 = at the start gate). */
export function runnerLeft(frac: number): string {
  return `calc(108px + (100% - 156px) * ${frac})`;
}
