import type { Pick } from '../domain/types';
import type { MyTips, MyTipsMatch } from './myTips';

export type Verdict = 'right' | 'wrong' | 'pending' | 'none';

/** A pick's standing against the actual outcome: right/wrong once played, 'pending' before, 'none' if not picked. */
export function verdict(pick: Pick | null, outcome: Pick | undefined): Verdict {
  if (!pick) return 'none';
  if (!outcome) return 'pending';
  return pick === outcome ? 'right' : 'wrong';
}

/** Flatten a player's grouped match tips into a single list (group order). */
export function flattenMatches(tips: MyTips): MyTipsMatch[] {
  return tips.groups.flatMap((g) => g.matches);
}

export interface CompareRow {
  id: string;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  mine: Pick | null;
  theirs: Pick | null;
  outcome: Pick | undefined;
  /** Both players picked and chose the same outcome. */
  same: boolean;
}

/** Pair my picks against another player's, match by match. */
export function compareMatches(me: MyTips, other: MyTips, outcomes: Record<string, Pick>): CompareRow[] {
  const theirById = new Map(flattenMatches(other).map((m) => [m.id, m.pick]));
  return flattenMatches(me).map((m) => {
    const theirs = theirById.get(m.id) ?? null;
    return {
      id: m.id,
      homeLabel: m.homeLabel,
      awayLabel: m.awayLabel,
      kickoff: m.kickoff,
      mine: m.pick,
      theirs,
      outcome: outcomes[m.id],
      same: m.pick !== null && theirs !== null && m.pick === theirs,
    };
  });
}

export interface CompareSummary {
  same: number;
  diff: number;
}

/** Count agreements/disagreements over matches both players picked. */
export function summarize(rows: CompareRow[]): CompareSummary {
  let same = 0;
  let diff = 0;
  for (const r of rows) {
    if (r.mine === null || r.theirs === null) continue;
    if (r.same) same++;
    else diff++;
  }
  return { same, diff };
}
