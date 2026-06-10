import { describe, it, expect } from 'vitest';
import { progressPercent, railFraction, runnerLeft, magnetTopPercent, magnetLeftPercent } from './barometer';

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

describe('magnetTopPercent', () => {
  it('starts in the own half and reaches the goal mouth at fraction 1', () => {
    expect(magnetTopPercent(0)).toBe(90);
    expect(magnetTopPercent(1)).toBe(16);
  });
  it('is linear in between', () => {
    expect(magnetTopPercent(0.5)).toBe(53);
  });
  it('clamps fractions outside 0..1', () => {
    expect(magnetTopPercent(-1)).toBe(90);
    expect(magnetTopPercent(2)).toBe(16);
  });
});

describe('magnetLeftPercent', () => {
  it('puts the leader through the middle and spreads the rest', () => {
    expect(magnetLeftPercent(0)).toBe(50);
    expect(magnetLeftPercent(1)).not.toBe(magnetLeftPercent(2));
  });
  it('stays inside the pitch for a full squad', () => {
    for (let i = 0; i < 12; i++) {
      expect(magnetLeftPercent(i)).toBeGreaterThanOrEqual(15);
      expect(magnetLeftPercent(i)).toBeLessThanOrEqual(85);
    }
  });
});
