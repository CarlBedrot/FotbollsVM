// lib/domain/rules.test.ts
import { describe, it, expect } from 'vitest';
import { RULES, MAX_POINTS } from './rules';

describe('scoring rules', () => {
  it('sum to 168 over the WC2026 structure', () => {
    const total =
      72 * RULES.matchPoint +
      12 * RULES.groupWinnerPoint +
      1 * RULES.mostGoalsPoint +
      1 * RULES.fewestGoalsPoint +
      2 * RULES.finalistPoint +
      1 * RULES.bronzePoint +
      1 * RULES.championPoint;
    expect(total).toBe(168);
    expect(total).toBe(MAX_POINTS);
  });
});
