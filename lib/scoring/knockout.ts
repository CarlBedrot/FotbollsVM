import type { Match, Stage } from '../domain/types';
import { matchOutcome } from './outcome';

function stageMatch(stage: Stage, matches: Match[]): Match | undefined {
  return matches.find((m) => m.stage === stage);
}

function winnerOf(match: Match | undefined): string | null {
  if (!match) return null;
  const o = matchOutcome(match);
  if (o === '1') return match.homeTeamId;
  if (o === '2') return match.awayTeamId;
  return null; // draw or undecided: resolved via manual override upstream
}

/** The two teams playing the final, once both are assigned. */
export function finalists(matches: Match[]): string[] {
  const final = stageMatch('final', matches);
  if (!final || !final.homeTeamId || !final.awayTeamId) return [];
  return [final.homeTeamId, final.awayTeamId];
}

/** Winner of the final, once finished. */
export function champion(matches: Match[]): string | null {
  return winnerOf(stageMatch('final', matches));
}

/** Winner of the bronze match, once finished. */
export function bronzeWinner(matches: Match[]): string | null {
  return winnerOf(stageMatch('bronze', matches));
}
