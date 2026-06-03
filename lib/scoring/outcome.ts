import type { Match, Pick } from '../domain/types';

/** Returns '1' | 'X' | '2' for a finished match, or null if not decided yet. */
export function matchOutcome(match: Match): Pick | null {
  if (match.status !== 'finished') return null;
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return '1';
  if (match.homeScore < match.awayScore) return '2';
  return 'X';
}
