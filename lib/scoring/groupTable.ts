import type { GroupId, Match, Team } from '../domain/types';

export interface GroupRow {
  teamId: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

function blankRow(teamId: string): GroupRow {
  return { teamId, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
}

function finishedGroupMatches(group: GroupId, matches: Match[]): Match[] {
  return matches.filter(
    (m) =>
      m.stage === 'group' &&
      m.group === group &&
      m.status === 'finished' &&
      m.homeScore !== null &&
      m.awayScore !== null,
  );
}

function accumulate(rows: Map<string, GroupRow>, matches: Match[]): void {
  for (const m of matches) {
    const home = rows.get(m.homeTeamId!);
    const away = rows.get(m.awayTeamId!);
    if (!home || !away) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;
    if (hs > as) home.points += 3;
    else if (hs < as) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }
  for (const row of rows.values()) row.goalDiff = row.goalsFor - row.goalsAgainst;
}

/** Head-to-head points among a tied subset of teams (matches between them only). */
function headToHeadPoints(tiedTeamIds: string[], matches: Match[]): Map<string, number> {
  const set = new Set(tiedTeamIds);
  const pts = new Map<string, number>(tiedTeamIds.map((id) => [id, 0]));
  for (const m of matches) {
    if (!set.has(m.homeTeamId!) || !set.has(m.awayTeamId!)) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    if (hs > as) pts.set(m.homeTeamId!, pts.get(m.homeTeamId!)! + 3);
    else if (hs < as) pts.set(m.awayTeamId!, pts.get(m.awayTeamId!)! + 3);
    else {
      pts.set(m.homeTeamId!, pts.get(m.homeTeamId!)! + 1);
      pts.set(m.awayTeamId!, pts.get(m.awayTeamId!)! + 1);
    }
  }
  return pts;
}

/**
 * Group table sorted by FIFA tiebreakers:
 * points → goal diff → goals for → head-to-head points → teamId (deterministic last resort).
 */
export function computeGroupTable(group: GroupId, teams: Team[], matches: Match[]): GroupRow[] {
  const groupTeams = teams.filter((t) => t.group === group);
  const rows = new Map<string, GroupRow>(groupTeams.map((t) => [t.id, blankRow(t.id)]));
  const played = finishedGroupMatches(group, matches);
  accumulate(rows, played);
  const all = [...rows.values()];

  return all.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const tied = all
      .filter((r) => r.points === a.points && r.goalDiff === a.goalDiff && r.goalsFor === a.goalsFor)
      .map((r) => r.teamId);
    if (tied.length > 1) {
      const h2h = headToHeadPoints(tied, played);
      const diff = (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0);
      if (diff !== 0) return diff;
    }
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
  });
}

/** True when every round-robin match of the group is finished. */
export function isGroupComplete(group: GroupId, teams: Team[], matches: Match[]): boolean {
  const n = teams.filter((t) => t.group === group).length;
  const expected = (n * (n - 1)) / 2;
  return expected > 0 && finishedGroupMatches(group, matches).length >= expected;
}

/** Winner (1st place) of each complete group; incomplete groups are omitted. */
export function groupWinners(groups: readonly GroupId[], teams: Team[], matches: Match[]): Map<GroupId, string> {
  const winners = new Map<GroupId, string>();
  for (const g of groups) {
    if (!isGroupComplete(g, teams, matches)) continue;
    const table = computeGroupTable(g, teams, matches);
    if (table.length > 0) winners.set(g, table[0].teamId);
  }
  return winners;
}
