import { describe, it, expect } from 'vitest';
import { buildAllTips } from './allTips';
import type { Fixtures } from '../fixtures/types';
import type { StoredPrediction } from '../db/predictionRepository';
import type { MatchView } from './matchView';

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
  ],
};

const users = [
  { id: 'u1', displayName: 'Carl', color: '#aaa', avatarUrl: null },
  { id: 'u2', displayName: 'Wilhelm', color: '#bbb', avatarUrl: null },
  { id: 'u3', displayName: 'August', color: '#ccc', avatarUrl: null },
];

const predictions: StoredPrediction[] = [
  { userId: 'u2', matchPicks: { G001: '1', G002: 'X' }, bonus: {} },
  { userId: 'u1', matchPicks: { G001: '2' }, bonus: {} },
  { userId: 'u3', matchPicks: { G001: '1' }, bonus: {} },
];

function view(over: Partial<MatchView>): MatchView {
  return { id: 'G001', stage: 'group', group: 'A', homeLabel: 'Mexico', awayLabel: 'South Africa', kickoff: '2026-06-11T19:00:00.000Z', status: 'scheduled', homeScore: null, awayScore: null, outcome: null, ...over };
}

describe('buildAllTips', () => {
  it('lists me first, then others alphabetically, when revealed', () => {
    const all = buildAllTips({ meId: 'u1', users, predictions, matches: [], fixtures, revealed: true });
    expect(all.players.map((p) => p.displayName)).toEqual(['Carl', 'August', 'Wilhelm']);
  });

  it('includes only my sheet when not revealed', () => {
    const all = buildAllTips({ meId: 'u1', users, predictions, matches: [], fixtures, revealed: false });
    expect(all.players.map((p) => p.userId)).toEqual(['u1']);
  });

  it('maps outcomes for finished matches only', () => {
    const matches = [
      view({ id: 'G001', status: 'finished', outcome: '2' }),
      view({ id: 'G002', status: 'scheduled', outcome: null }),
    ];
    const all = buildAllTips({ meId: 'u1', users, predictions, matches, fixtures, revealed: true });
    expect(all.outcomes).toEqual({ G001: '2' });
  });

  it('skips predictions with no matching user', () => {
    const preds: StoredPrediction[] = [...predictions, { userId: 'ghost', matchPicks: { G001: '1' }, bonus: {} }];
    const all = buildAllTips({ meId: 'u1', users, predictions: preds, matches: [], fixtures, revealed: true });
    expect(all.players.some((p) => p.userId === 'ghost')).toBe(false);
  });
});
