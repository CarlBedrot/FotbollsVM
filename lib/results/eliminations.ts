import type { Match, Stage } from "../domain/types";
import { matchOutcome } from "../scoring/outcome";

/** Rounds where losing puts a team out of every remaining bonus. SF losers are
 *  excluded (they can still win bronze), and by the bronze/final stage the
 *  decided-flags in remaining.ts already lock those categories. */
const ELIMINATING_STAGES: ReadonlySet<Stage> = new Set(["r32", "r16", "qf"]);

/** Losers of decisively finished knockout matches. A knockout draw (decided on
 *  penalties, stored as an equal fulltime score) yields no loser — admin
 *  resolves those manually. */
export function knockoutLosers(matches: Match[]): string[] {
  const losers: string[] = [];
  for (const m of matches) {
    if (!ELIMINATING_STAGES.has(m.stage)) continue;
    const outcome = matchOutcome(m);
    if (outcome === "1" && m.awayTeamId) losers.push(m.awayTeamId);
    if (outcome === "2" && m.homeTeamId) losers.push(m.homeTeamId);
  }
  return losers;
}
