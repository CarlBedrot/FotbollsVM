/** A linear mapping from a numeric domain to an output range. Safe for a
 *  zero-width domain (returns range start instead of NaN). */
export function linearScale(domain: [number, number], range: [number, number]): (v: number) => number {
  const span = domain[1] - domain[0];
  return (v: number) => (span === 0 ? range[0] : range[0] + ((v - domain[0]) / span) * (range[1] - range[0]));
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Builds an SVG path string ("M … L …") from screen-space points. */
export function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${r(p.x)} ${r(p.y)}`)
    .join(' ');
}
