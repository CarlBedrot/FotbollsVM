import { describe, it, expect } from 'vitest';
import { mergeStandings } from './standingsView';
import type { Standing } from '../results/types';
import type { UserRecord } from '../db/userRepository';

const bd = { matchPoints: 0, groupWinnerPoints: 0, mostGoalsPoints: 0, fewestGoalsPoints: 0, finalistPoints: 0, bronzePoints: 0, championPoints: 0 };
const user = (id: string, name: string, color: string): UserRecord => ({
  id, username: name.toLowerCase(), displayName: name, passwordHash: 'x', isAdmin: false, avatarUrl: null, color, createdAt: '',
});

describe('mergeStandings', () => {
  const users = [user('u1', 'Carl', '#e23b3b'), user('u2', 'Emil', '#2b5fd0')];
  const standings: Standing[] = [
    { userId: 'u1', rank: 1, prevRank: 2, totalPoints: 63, matchPoints: 50, bonusPoints: 13, breakdown: bd },
    { userId: 'u2', rank: 2, prevRank: 1, totalPoints: 58, matchPoints: 48, bonusPoints: 10, breakdown: bd },
  ];
  it('joins display info and computes movement', () => {
    const view = mergeStandings(standings, users);
    expect(view[0]).toMatchObject({ userId: 'u1', displayName: 'Carl', color: '#e23b3b', rank: 1, totalPoints: 63, movement: 'up' });
    expect(view[1].movement).toBe('down');
  });
  it('marks a never-before-ranked user as new', () => {
    const view = mergeStandings([{ ...standings[0], prevRank: null }], users);
    expect(view[0].movement).toBe('new');
  });
  it('sorts by rank and tolerates a missing user record', () => {
    const view = mergeStandings(standings, [users[0]]);
    expect(view.map((v) => v.rank)).toEqual([1, 2]);
    expect(view[1].displayName).toBe('Okänd'); // u2 record missing → fallback
  });
});
