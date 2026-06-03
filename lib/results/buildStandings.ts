import type { ScoringInput, TieData } from '../domain/types';
import { computeScores, rankScores } from '../scoring/score';
import type { Standing } from './types';

export function buildStandings(
  input: ScoringInput,
  tie: Record<string, TieData>,
  prevRankByUser: Record<string, number>,
): Standing[] {
  const ranked = rankScores(computeScores(input), tie);
  return ranked.map((r) => ({
    userId: r.userId,
    rank: r.rank,
    prevRank: r.userId in prevRankByUser ? prevRankByUser[r.userId] : null,
    totalPoints: r.totalPoints,
    matchPoints: r.matchPoints,
    bonusPoints: r.bonusPoints,
    breakdown: r.breakdown,
  }));
}
