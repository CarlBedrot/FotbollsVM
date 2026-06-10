import { describe, it, expect } from 'vitest';
import { buildMyTips } from './myTips';
import type { Fixtures } from '../fixtures/types';

const fixtures: Fixtures = {
  season: 'WC2026',
  firstKickoff: '2026-06-11T19:00:00.000Z',
  teams: [
    { id: 'mexico', name: 'Mexico', group: 'A' },
    { id: 'south-africa', name: 'South Africa', group: 'A' },
    { id: 'canada', name: 'Canada', group: 'B' },
    { id: 'qatar', name: 'Qatar', group: 'B' },
  ],
  matches: [
    { id: 'G001', stage: 'group', group: 'A', homeTeamId: 'mexico', awayTeamId: 'south-africa', homeLabel: 'Mexico', awayLabel: 'South Africa', kickoff: '2026-06-11T19:00:00.000Z', ground: 'Mexico City' },
    { id: 'G002', stage: 'group', group: 'B', homeTeamId: 'canada', awayTeamId: 'qatar', homeLabel: 'Canada', awayLabel: 'Qatar', kickoff: '2026-06-12T19:00:00.000Z', ground: 'Toronto' },
    { id: 'K001', stage: 'r32', group: null, homeTeamId: null, awayTeamId: null, homeLabel: '1A', awayLabel: '2B', kickoff: '2026-06-29T19:00:00.000Z', ground: 'Dallas' },
  ],
};

describe('buildMyTips', () => {
  it('is null without a prediction', () => {
    expect(buildMyTips(null, fixtures)).toBeNull();
  });

  it('groups picks by group and resolves what the pick means', () => {
    const tips = buildMyTips(
      {
        userId: 'u1',
        matchPicks: { G001: '1', G002: 'X' },
        bonus: { group_winner_A: 'mexico', champion: 'canada', finalist_1: 'mexico' },
      },
      fixtures,
    )!;
    expect(tips.pickCount).toBe(2);
    expect(tips.groups).toHaveLength(2);
    expect(tips.groups[0].group).toBe('A');
    expect(tips.groups[0].matches[0]).toMatchObject({ id: 'G001', pick: '1', pickedLabel: 'Mexico' });
    expect(tips.groups[1].matches[0]).toMatchObject({ id: 'G002', pick: 'X', pickedLabel: 'Oavgjort' });
  });

  it('marks unanswered matches and resolves bonus team names', () => {
    const tips = buildMyTips(
      { userId: 'u1', matchPicks: {}, bonus: { group_winner_A: 'mexico', champion: 'canada' } },
      fixtures,
    )!;
    expect(tips.groups[0].matches[0].pick).toBeNull();
    expect(tips.bonusCount).toBe(2);
    expect(tips.groupWinners.find((g) => g.group === 'A')!.teamName).toBe('Mexico');
    expect(tips.groupWinners.find((g) => g.group === 'B')!.teamName).toBeNull();
    expect(tips.champion).toBe('Canada');
    expect(tips.finalist1).toBeNull();
  });
});
