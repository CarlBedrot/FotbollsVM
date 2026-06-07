import { describe, it, expect } from 'vitest';
import { progressPercent, railFraction, runnerLeft } from './barometer';

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

describe('railFraction', () => {
  it('is 0 at the start and 1 at the finish', () => {
    expect(railFraction(0)).toBe(0);
    expect(railFraction(168)).toBe(1);
  });
  it('clamps above max to 1', () => {
    expect(railFraction(200)).toBe(1);
  });
});

describe('runnerLeft', () => {
  it('sits at the start gate at fraction 0', () => {
    expect(runnerLeft(0)).toBe('calc(108px + (100% - 156px) * 0)');
  });
  it('scales by the rail fraction', () => {
    expect(runnerLeft(1)).toBe('calc(108px + (100% - 156px) * 1)');
    expect(runnerLeft(0.5)).toBe('calc(108px + (100% - 156px) * 0.5)');
  });
});
