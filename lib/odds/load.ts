import oddsJson from '../../data/odds.json';
import type { Pick } from '../domain/types';

/** Decimal (European) odds for the three outcomes of one match. */
export type MatchOdds = Record<Pick, number>;

/**
 * Pre-tournament odds snapshot. Like the tips, the reference point is frozen
 * at the lock — fill data/odds.json from a bookmaker before first kickoff.
 */
export interface OddsBook {
  source: string;
  matchOdds: Record<string, MatchOdds>;
}

export function loadOdds(): OddsBook {
  return oddsJson as OddsBook;
}

/** Odds for a match, or null when missing or malformed (decimal odds must be > 1). */
export function oddsFor(book: OddsBook, matchId: string): MatchOdds | null {
  const o = book.matchOdds[matchId];
  if (!o) return null;
  if (!(o['1'] > 1 && o.X > 1 && o['2'] > 1)) return null;
  return o;
}

/** Bookmaker probabilities for 1/X/2 with the overround normalised away. */
export function impliedProbabilities(odds: MatchOdds): Record<Pick, number> {
  const inv: Record<Pick, number> = { '1': 1 / odds['1'], X: 1 / odds.X, '2': 1 / odds['2'] };
  const sum = inv['1'] + inv.X + inv['2'];
  return { '1': inv['1'] / sum, X: inv.X / sum, '2': inv['2'] / sum };
}

/** The bookmakers' favourite outcome (lowest odds). */
export function favouriteOutcome(odds: MatchOdds): Pick {
  if (odds['1'] <= odds.X && odds['1'] <= odds['2']) return '1';
  if (odds['2'] <= odds.X) return '2';
  return 'X';
}
