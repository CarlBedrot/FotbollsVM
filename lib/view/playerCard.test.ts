import { describe, it, expect } from 'vitest';
import { buildPlayerCard } from './playerCard';
import type { StandingView } from './standingsView';
import type { MatchView } from './matchView';
import type { StoredPrediction } from '../db/predictionRepository';

const STANDING: StandingView = {
  userId: 'u1', displayName: 'Wilhelm', color: '#abc', avatarUrl: 'http://x/a.png',
  rank: 2, prevRank: 4, totalPoints: 98, matchPoints: 70, bonusPoints: 28, movement: 'up',
};

function match(over: Partial<MatchView>): MatchView {
  return {
    id: 'G010', stage: 'group', group: 'B', homeLabel: 'Sweden', awayLabel: 'Brazil',
    kickoff: '2026-06-20T19:00:00Z', status: 'scheduled', homeScore: null, awayScore: null, outcome: null,
    ...over,
  };
}

const users = [{ id: 'u1', displayName: 'Wilhelm', color: '#abc', avatarUrl: 'http://x/a.png' }];

describe('buildPlayerCard', () => {
  it('pulls identity, rank, movement and points from the standing', () => {
    const card = buildPlayerCard({ userId: 'u1', standings: [STANDING], users, matches: [], predictions: [], revealed: true });
    expect(card).toMatchObject({ displayName: 'Wilhelm', rank: 2, movement: 'up', totalPoints: 98 });
  });

  it('picks the earliest non-finished match as the next match', () => {
    const matches = [
      match({ id: 'G001', status: 'finished', kickoff: '2026-06-11T19:00:00Z' }),
      match({ id: 'G010', status: 'scheduled', kickoff: '2026-06-20T19:00:00Z', homeLabel: 'Sweden', awayLabel: 'Brazil' }),
      match({ id: 'G011', status: 'scheduled', kickoff: '2026-06-21T19:00:00Z' }),
    ];
    const predictions: StoredPrediction[] = [{ userId: 'u1', matchPicks: { G010: '1' }, bonus: {} }];
    const card = buildPlayerCard({ userId: 'u1', standings: [STANDING], users, matches, predictions, revealed: true });
    expect(card?.nextMatch).toEqual({ homeLabel: 'Sweden', awayLabel: 'Brazil', kickoff: '2026-06-20T19:00:00Z' });
    expect(card?.nextPick).toBe('1');
  });

  it('withholds the pick until predictions are revealed', () => {
    const matches = [match({ id: 'G010' })];
    const predictions: StoredPrediction[] = [{ userId: 'u1', matchPicks: { G010: '2' }, bonus: {} }];
    const card = buildPlayerCard({ userId: 'u1', standings: [STANDING], users, matches, predictions, revealed: false });
    expect(card?.nextPick).toBeNull();
    expect(card?.revealed).toBe(false);
  });

  it('returns a null pick for a knockout next match (no pick exists)', () => {
    const matches = [match({ id: 'K73', stage: 'r32', homeLabel: '2A', awayLabel: '2B' })];
    const card = buildPlayerCard({ userId: 'u1', standings: [STANDING], users, matches, predictions: [], revealed: true });
    expect(card?.nextMatch?.homeLabel).toBe('2A');
    expect(card?.nextPick).toBeNull();
  });

  it('falls back to the user record when the player has no standing yet', () => {
    const card = buildPlayerCard({ userId: 'u1', standings: [], users, matches: [], predictions: [], revealed: true });
    expect(card).toMatchObject({ displayName: 'Wilhelm', rank: null, movement: null, totalPoints: 0 });
  });

  it('returns null for an unknown player', () => {
    const card = buildPlayerCard({ userId: 'ghost', standings: [STANDING], users, matches: [], predictions: [], revealed: true });
    expect(card).toBeNull();
  });

  it('has no next match when every fixture is finished', () => {
    const matches = [match({ id: 'G001', status: 'finished' })];
    const card = buildPlayerCard({ userId: 'u1', standings: [STANDING], users, matches, predictions: [], revealed: true });
    expect(card?.nextMatch).toBeNull();
    expect(card?.nextPick).toBeNull();
  });
});
