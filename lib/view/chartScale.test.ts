import { describe, it, expect } from 'vitest';
import { linearScale, buildLinePath } from './chartScale';

describe('linearScale', () => {
  it('maps the domain onto the range linearly', () => {
    const s = linearScale([0, 10], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(100);
  });

  it('inverts the range (SVG y grows downward)', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(10)).toBe(0);
  });

  it('does not divide by zero for a zero-width domain', () => {
    const s = linearScale([5, 5], [0, 100]);
    expect(s(5)).toBe(0);
  });
});

describe('buildLinePath', () => {
  it('returns an empty string for no points', () => {
    expect(buildLinePath([])).toBe('');
  });

  it('emits a single move for one point', () => {
    expect(buildLinePath([{ x: 0, y: 0 }])).toBe('M 0 0');
  });

  it('moves then lines through the rest, rounded to one decimal', () => {
    expect(buildLinePath([{ x: 0, y: 0 }, { x: 1.25, y: 2 }])).toBe('M 0 0 L 1.3 2');
  });
});
