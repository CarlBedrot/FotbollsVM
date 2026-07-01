import { describe, it, expect } from 'vitest';
import { GROUP_IDS } from '../domain/rules';
import type { Match, Team } from '../domain/types';
import { buildGoalsFacit } from './goalsFacit';

/** 12 groups x 4 teams; in each group the lower local index beats higher 2-0. */
function finishedGroupStage(): { teams: Team[]; matches: Match[] } {
  const teams: Team[] = [];
  const matches: Match[] = [];
  let mid = 0;
  for (let gi = 0; gi < GROUP_IDS.length; gi++) {
    const ids = [0, 1, 2, 3].map((t) => String(gi * 4 + t));
    ids.forEach((id) => teams.push({ id, name: `Team ${id}`, group: GROUP_IDS[gi] }));
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        matches.push({
          id: `g${mid++}`, stage: 'group', group: GROUP_IDS[gi],
          homeTeamId: ids[a], awayTeamId: ids[b], status: 'finished', homeScore: 2, awayScore: 0,
        });
      }
    }
  }
  return { teams, matches };
}

describe('buildGoalsFacit', () => {
  it('reports most/fewest goals with counts once the group stage is complete', () => {
    const { teams, matches } = finishedGroupStage();
    const facit = buildGoalsFacit(teams, matches);
    expect(facit.complete).toBe(true);
    // Each group's index-0 team wins its 3 matches 2-0 → 6 goals; index-3 team → 0.
    expect(facit.most.goals).toBe(6);
    expect(facit.most.teamNames).toHaveLength(GROUP_IDS.length); // all 12 group winners tie
    expect(facit.fewest.goals).toBe(0);
    expect(facit.fewest.teamNames).toContain('Team 3');
  });

  it('is not complete while any group is unfinished', () => {
    const { teams, matches } = finishedGroupStage();
    const facit = buildGoalsFacit(teams, matches.slice(0, -1)); // drop one match
    expect(facit.complete).toBe(false);
    expect(facit.most).toEqual({ teamNames: [], goals: 0 });
  });
});
