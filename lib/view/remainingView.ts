import type { Match } from '../domain/types';
import type { StandingView } from './standingsView';
import type { UserRemaining, RemainingCategory, DecidedFlags } from '../scoring/remaining';

export interface RemainingRowCategory {
  key: string;
  label: string;
  points: number;
  teamName: string | null;
  alive: boolean;
  decided: boolean;
  counts: boolean;
}

export interface RemainingRow {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  currentTotal: number;
  reachable: number;
  possibleTotal: number;
  categories: RemainingRowCategory[];
}

/** A category is "decided" once its deciding knockout match has been played. */
export function decidedFromMatches(matches: Match[]): DecidedFlags {
  const finished = (stage: Match['stage']) =>
    matches.filter((m) => m.stage === stage && m.status === 'finished').length;
  return {
    champion: finished('final') >= 1,
    bronze: finished('bronze') >= 1,
    finalists: finished('sf') >= 2,
  };
}

function toRowCategory(c: RemainingCategory, teamName: (id: string) => string): RemainingRowCategory {
  return {
    key: c.key,
    label: c.label,
    points: c.points,
    teamName: c.teamId ? teamName(c.teamId) : null,
    alive: c.alive,
    decided: c.decided,
    counts: c.counts,
  };
}

/** Join standings (current total) with remaining points, sorted by best possible finish. */
export function buildRemainingRows(
  standings: StandingView[],
  remaining: UserRemaining[],
  teamName: (id: string) => string,
): RemainingRow[] {
  const remById = new Map(remaining.map((r) => [r.userId, r]));
  const rows = standings.map((s): RemainingRow => {
    const rem = remById.get(s.userId);
    const reachable = rem?.reachable ?? 0;
    return {
      userId: s.userId,
      displayName: s.displayName,
      color: s.color,
      avatarUrl: s.avatarUrl,
      currentTotal: s.totalPoints,
      reachable,
      possibleTotal: s.totalPoints + reachable,
      categories: (rem?.categories ?? []).map((c) => toRowCategory(c, teamName)),
    };
  });
  return rows.sort(
    (a, b) =>
      b.possibleTotal - a.possibleTotal ||
      b.currentTotal - a.currentTotal ||
      a.displayName.localeCompare(b.displayName, 'sv'),
  );
}
