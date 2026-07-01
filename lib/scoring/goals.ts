import type { Match, Team } from '../domain/types';

/** Goals scored per team across finished group-stage matches. */
export function teamGoalTotals(teams: Team[], matches: Match[]): Map<string, number> {
  const goals = new Map<string, number>(teams.map((t) => [t.id, 0]));
  for (const m of matches) {
    if (m.stage !== 'group' || m.status !== 'finished') continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    if (goals.has(m.homeTeamId!)) goals.set(m.homeTeamId!, goals.get(m.homeTeamId!)! + m.homeScore);
    if (goals.has(m.awayTeamId!)) goals.set(m.awayTeamId!, goals.get(m.awayTeamId!)! + m.awayScore);
  }
  return goals;
}

/** Team ids with the most total goals across the group stage (ties → all). */
export function mostGoalsTeams(teams: Team[], matches: Match[]): string[] {
  const goals = teamGoalTotals(teams, matches);
  const values = [...goals.values()];
  if (values.length === 0) return [];
  const max = Math.max(...values);
  return [...goals.entries()].filter(([, g]) => g === max).map(([id]) => id);
}

/** Team ids with the fewest total goals across the group stage (ties → all). */
export function fewestGoalsTeams(teams: Team[], matches: Match[]): string[] {
  const goals = teamGoalTotals(teams, matches);
  const values = [...goals.values()];
  if (values.length === 0) return [];
  const min = Math.min(...values);
  return [...goals.entries()].filter(([, g]) => g === min).map(([id]) => id);
}
