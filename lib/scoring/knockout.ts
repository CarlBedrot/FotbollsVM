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

/** The two teams playing the bronze match (the semifinal losers), once assigned. */
export function bronzeContenders(matches: Match[]): string[] {
  const bronze = stageMatch('bronze', matches);
  if (!bronze || !bronze.homeTeamId || !bronze.awayTeamId) return [];
  return [bronze.homeTeamId, bronze.awayTeamId];
}

/** Winner of the final, once finished. */
export function champion(matches: Match[]): string | null {
  return winnerOf(stageMatch('final', matches));
}

/** Winner of the bronze match, once finished. */
export function bronzeWinner(matches: Match[]): string | null {
  return winnerOf(stageMatch('bronze', matches));
}

function semifinalResults(matches: Match[]): { winners: string[]; losers: string[] } {
  const winners: string[] = [];
  const losers: string[] = [];
  for (const m of matches) {
    if (m.stage !== 'sf' || !m.homeTeamId || !m.awayTeamId) continue;
    const o = matchOutcome(m);
    if (o === '1') {
      winners.push(m.homeTeamId);
      losers.push(m.awayTeamId);
    } else if (o === '2') {
      winners.push(m.awayTeamId);
      losers.push(m.homeTeamId);
    }
    // draw (penalties) or unfinished: neither side known — admin resolves upstream
  }
  return { winners, losers };
}

/** Winners of decisively finished semifinals (headed to the final). */
export function semifinalWinners(matches: Match[]): string[] {
  return semifinalResults(matches).winners;
}

/** Losers of decisively finished semifinals (headed to the bronze match). */
export function semifinalLosers(matches: Match[]): string[] {
  return semifinalResults(matches).losers;
}
