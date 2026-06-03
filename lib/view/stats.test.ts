import { describe, it, expect } from 'vitest';
import { computeStats } from './stats';
import type { StandingView } from './standingsView';

const v = (over: Partial<StandingView>): StandingView => ({
  userId: 'x', displayName: 'X', color: '#000', avatarUrl: null,
  rank: 1, prevRank: 1, totalPoints: 0, matchPoints: 0, bonusPoints: 0, movement: 'same', ...over,
});

describe('computeStats', () => {
  it('returns leader, best-on-results, biggest climber, most bonus', () => {
    const views = [
      v({ displayName: 'Carl', rank: 1, totalPoints: 63, matchPoints: 50, bonusPoints: 13, prevRank: 1, movement: 'same' }),
      v({ displayName: 'Emil', rank: 2, totalPoints: 58, matchPoints: 40, bonusPoints: 18, prevRank: 4, movement: 'up' }),
    ];
    const stats = computeStats(views);
    const byKey = Object.fromEntries(stats.map((s) => [s.key, s]));
    expect(byKey.leader.who).toBe('Carl');
    expect(byKey.bestResults.who).toBe('Carl');     // highest matchPoints
    expect(byKey.climber.who).toBe('Emil');         // prevRank 4 → 2 = +2
    expect(byKey.mostBonus.who).toBe('Emil');       // highest bonusPoints
  });
  it('returns an empty list when there are no standings', () => {
    expect(computeStats([])).toEqual([]);
  });
});
