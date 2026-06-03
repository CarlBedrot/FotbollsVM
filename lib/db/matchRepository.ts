import type { Match } from '../domain/types';

export interface MatchResultInput {
  homeScore: number;
  awayScore: number;
  source: 'manual' | 'api';
  updatedBy: string | null;
}

export interface MatchRepository {
  all(): Promise<Match[]>;
  setResult(matchId: string, result: MatchResultInput): Promise<void>;
}
