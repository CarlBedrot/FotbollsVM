import type { Team, Match } from '../domain/types';
import { GROUP_IDS } from '../domain/rules';
import { isGroupComplete } from '../scoring/groupTable';
import { teamGoalTotals, mostGoalsTeams, fewestGoalsTeams } from '../scoring/goals';

export interface GoalsFacitSide {
  /** Team names sharing the extreme (ties → all), sorted for display. */
  teamNames: string[];
  goals: number;
}

export interface GoalsFacit {
  /** The group stage is fully played — only then are the totals final. */
  complete: boolean;
  most: GoalsFacitSide;
  fewest: GoalsFacitSide;
}

const EMPTY_SIDE: GoalsFacitSide = { teamNames: [], goals: 0 };

/** Which team(s) scored the most and fewest goals across the group stage. */
export function buildGoalsFacit(teams: Team[], matches: Match[]): GoalsFacit {
  const complete = GROUP_IDS.every((g) => isGroupComplete(g, teams, matches));
  if (!complete) return { complete: false, most: EMPTY_SIDE, fewest: EMPTY_SIDE };

  const totals = teamGoalTotals(teams, matches);
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const side = (ids: string[]): GoalsFacitSide => ({
    teamNames: ids.map((id) => nameById.get(id) ?? id).sort((a, b) => a.localeCompare(b, 'sv')),
    goals: ids.length ? totals.get(ids[0]) ?? 0 : 0,
  });

  return { complete: true, most: side(mostGoalsTeams(teams, matches)), fewest: side(fewestGoalsTeams(teams, matches)) };
}
