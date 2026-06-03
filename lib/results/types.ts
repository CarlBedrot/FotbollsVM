import type { ScoreBreakdown } from '../domain/types';

export interface Standing {
  userId: string;
  rank: number;
  prevRank: number | null;
  totalPoints: number;
  matchPoints: number;
  bonusPoints: number;
  breakdown: ScoreBreakdown;
}

export interface ResultProposal {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  homeScore: number;
  awayScore: number;
  matchedBy: 'exact' | 'alias' | 'unmatched';
}
