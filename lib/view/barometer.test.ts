import { describe, it, expect } from 'vitest';
import { progressPercent } from './barometer';

describe('progressPercent', () => {
  it('is 0 at zero points and ~the cap at max', () => {
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(168)).toBe(92);
  });
  it('is linear in between', () => {
    expect(progressPercent(84)).toBe(46);
  });
  it('clamps above max', () => {
    expect(progressPercent(200)).toBe(92);
  });
});
