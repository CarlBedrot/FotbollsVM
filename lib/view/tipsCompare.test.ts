import { describe, it, expect } from 'vitest';
import { verdict, compareMatches, summarize } from './tipsCompare';
import type { MyTips } from './myTips';

function tips(picks: Record<string, '1' | 'X' | '2'>): MyTips {
  return {
    pickCount: Object.keys(picks).length,
    bonusCount: 0,
    groups: [
      {
        group: 'A',
        matches: [
          { id: 'G001', homeLabel: 'Mexico', awayLabel: 'South Africa', kickoff: '2026-06-11T19:00:00Z', pick: picks.G001 ?? null, pickedLabel: null },
          { id: 'G002', homeLabel: 'Canada', awayLabel: 'Qatar', kickoff: '2026-06-12T19:00:00Z', pick: picks.G002 ?? null, pickedLabel: null },
        ],
      },
    ],
    groupWinners: [], mostGoals: null, fewestGoals: null, finalist1: null, finalist2: null, bronze: null, champion: null,
  };
}

describe('verdict', () => {
  it('is none without a pick, pending before the result, right/wrong after', () => {
    expect(verdict(null, undefined)).toBe('none');
    expect(verdict('1', undefined)).toBe('pending');
    expect(verdict('1', '1')).toBe('right');
    expect(verdict('1', '2')).toBe('wrong');
  });
});

describe('compareMatches + summarize', () => {
  it('pairs picks and flags agreements', () => {
    const rows = compareMatches(tips({ G001: '1', G002: 'X' }), tips({ G001: '1', G002: '2' }), { G001: '1' });
    expect(rows[0]).toMatchObject({ mine: '1', theirs: '1', outcome: '1', same: true });
    expect(rows[1]).toMatchObject({ mine: 'X', theirs: '2', same: false });
  });

  it('counts only matches both players picked', () => {
    const rows = compareMatches(tips({ G001: '1', G002: 'X' }), tips({ G001: '1' }), {});
    expect(summarize(rows)).toEqual({ same: 1, diff: 0 });
  });
});
