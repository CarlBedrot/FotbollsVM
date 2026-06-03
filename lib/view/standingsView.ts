import type { Standing } from '../results/types';
import type { UserRecord } from '../db/userRepository';

export type Movement = 'up' | 'down' | 'same' | 'new';

export interface StandingView {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  rank: number;
  prevRank: number | null;
  totalPoints: number;
  matchPoints: number;
  bonusPoints: number;
  movement: Movement;
}

function movementOf(rank: number, prevRank: number | null): Movement {
  if (prevRank === null) return 'new';
  if (prevRank > rank) return 'up';
  if (prevRank < rank) return 'down';
  return 'same';
}

export function mergeStandings(standings: Standing[], users: UserRecord[]): StandingView[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  return [...standings]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const u = byId.get(s.userId);
      return {
        userId: s.userId,
        displayName: u?.displayName ?? 'Okänd',
        color: u?.color ?? '#566087',
        avatarUrl: u?.avatarUrl ?? null,
        rank: s.rank,
        prevRank: s.prevRank,
        totalPoints: s.totalPoints,
        matchPoints: s.matchPoints,
        bonusPoints: s.bonusPoints,
        movement: movementOf(s.rank, s.prevRank),
      };
    });
}
