import { describe, it, expect } from 'vitest';
import { oddsDistance, bestOddsHits, pickDistribution, winnerBoard } from './extraStats';
import type { OddsBook } from '../odds/load';

const users = [
  { id: 'u1', displayName: 'Carl', color: '#111', avatarUrl: null },
  { id: 'u2', displayName: 'Petter', color: '#222', avatarUrl: null },
];

const book: OddsBook = {
  source: 'test',
  matchOdds: {
    // favourite: 1 (p≈0.60), X p≈0.22, 2 p≈0.18 — after normalisation
    G001: { '1': 1.55, X: 4.2, '2': 5.2 },
    // favourite: 2
    G002: { '1': 6.0, X: 4.0, '2': 1.5 },
  },
};

describe('oddsDistance', () => {
  it('is 0 pp for someone who always picks the favourite', () => {
    const rows = oddsDistance(
      [{ userId: 'u1', matchPicks: { G001: '1', G002: '2' }, bonus: {} }],
      users,
      book,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].avgDistancePp).toBe(0);
    expect(rows[0].matchesWithOdds).toBe(2);
  });
  it('ranks the favourite-follower closest and the long-shot picker furthest', () => {
    const rows = oddsDistance(
      [
        { userId: 'u1', matchPicks: { G001: '1', G002: '2' }, bonus: {} },
        { userId: 'u2', matchPicks: { G001: '2', G002: '1' }, bonus: {} },
      ],
      users,
      book,
    );
    expect(rows[0].player.name).toBe('Carl');
    expect(rows[1].player.name).toBe('Petter');
    expect(rows[1].avgDistancePp).toBeGreaterThan(30);
  });
  it('ignores matches without odds and players without picks on odds matches', () => {
    const rows = oddsDistance(
      [{ userId: 'u1', matchPicks: { G999: '1' }, bonus: {} }],
      users,
      book,
    );
    expect(rows).toHaveLength(0);
  });
});

describe('bestOddsHits', () => {
  const matches = [
    { id: 'G001', homeLabel: 'Mexico', awayLabel: 'South Africa', status: 'finished', outcome: '2' as const },
    { id: 'G002', homeLabel: 'South Korea', awayLabel: 'Czech Republic', status: 'finished', outcome: '2' as const },
    { id: 'G003', homeLabel: 'Canada', awayLabel: 'Qatar', status: 'scheduled', outcome: null },
  ];
  it('finds each player’s highest-odds correct pick, sorted by odds', () => {
    const rows = bestOddsHits(
      [
        { userId: 'u1', matchPicks: { G001: '2', G002: '2' }, bonus: {} }, // hits 5.2 and 1.5
        { userId: 'u2', matchPicks: { G001: '1', G002: '2' }, bonus: {} }, // hits 1.5
      ],
      users,
      matches,
      book,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].player.name).toBe('Carl');
    expect(rows[0].odds).toBe(5.2);
    expect(rows[0].matchId).toBe('G001');
    expect(rows[1].odds).toBe(1.5);
  });
  it('ignores unfinished matches and players without correct picks', () => {
    const rows = bestOddsHits(
      [{ userId: 'u1', matchPicks: { G001: 'X', G003: '1' }, bonus: {} }],
      users,
      matches,
      book,
    );
    expect(rows).toHaveLength(0);
  });
});

describe('pickDistribution', () => {
  it('counts 1/X/2 per player and in total', () => {
    const dist = pickDistribution(
      [
        { userId: 'u1', matchPicks: { G001: '1', G002: '1', G003: 'X' }, bonus: {} },
        { userId: 'u2', matchPicks: { G001: '2', G002: 'X' }, bonus: {} },
      ],
      users,
    );
    expect(dist.rows).toHaveLength(2);
    expect(dist.rows[0].counts).toEqual({ '1': 2, X: 1, '2': 0 });
    expect(dist.rows[0].total).toBe(3);
    expect(dist.total.counts).toEqual({ '1': 2, X: 2, '2': 1 });
    expect(dist.total.total).toBe(5);
  });
  it('skips users without predictions', () => {
    const dist = pickDistribution([{ userId: 'u1', matchPicks: { G001: '1' }, bonus: {} }], users);
    expect(dist.rows).toHaveLength(1);
  });
});

describe('winnerBoard', () => {
  const teams = [
    { id: 'brazil', name: 'Brazil' },
    { id: 'argentina', name: 'Argentina' },
    { id: 'france', name: 'France' },
  ];
  it('groups champion picks by team, most popular first', () => {
    const board = winnerBoard(
      [
        { userId: 'u1', matchPicks: {}, bonus: { champion: 'brazil', finalist_1: 'brazil', finalist_2: 'france', bronze: 'argentina' } },
        { userId: 'u2', matchPicks: {}, bonus: { champion: 'brazil', finalist_1: 'argentina', finalist_2: 'brazil' } },
      ],
      users,
      teams,
    );
    expect(board.champion[0].teamName).toBe('Brazil');
    expect(board.champion[0].voters).toHaveLength(2);
    expect(board.finalists.map((f) => f.teamName)).toContain('France');
    expect(board.finalists.find((f) => f.teamName === 'Brazil')!.voters).toHaveLength(2);
    expect(board.bronze[0].teamName).toBe('Argentina');
  });
  it('ignores unknown team ids', () => {
    const board = winnerBoard(
      [{ userId: 'u1', matchPicks: {}, bonus: { champion: 'atlantis' } }],
      users,
      teams,
    );
    expect(board.champion).toHaveLength(0);
  });
});
