import { describe, it, expect } from 'vitest';
import { pickDistribution, winnerBoard } from './extraStats';

const users = [
  { id: 'u1', displayName: 'Carl', color: '#111', avatarUrl: null },
  { id: 'u2', displayName: 'Petter', color: '#222', avatarUrl: null },
];

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
