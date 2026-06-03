// lib/scoring/maxPoints.test.ts
import { describe, it, expect } from 'vitest';
import { GROUP_IDS, MAX_POINTS } from '../domain/rules';
import type { BonusKey, Match, Pick, Prediction, Team } from '../domain/types';
import { matchOutcome } from './outcome';
import { groupWinners } from './groupTable';
import { mostGoalsTeams, fewestGoalsTeams } from './goals';
import { finalists, champion, bronzeWinner } from './knockout';
import { computeScores } from './score';

/** 12 groups x 4 teams; in each group the lower local index beats higher 2-0. */
function buildFinishedTournament(): { teams: Team[]; matches: Match[] } {
  const teams: Team[] = [];
  for (let gi = 0; gi < GROUP_IDS.length; gi++) {
    for (let t = 0; t < 4; t++) {
      const idx = gi * 4 + t;
      teams.push({ id: String(idx), name: `Team ${idx}`, group: GROUP_IDS[gi] });
    }
  }

  const matches: Match[] = [];
  let mid = 0;
  for (let gi = 0; gi < GROUP_IDS.length; gi++) {
    const ids = [0, 1, 2, 3].map((t) => String(gi * 4 + t));
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        // lower local index (ids[a]) is home and wins 2-0
        matches.push({
          id: `g${mid++}`,
          stage: 'group',
          group: GROUP_IDS[gi],
          homeTeamId: ids[a],
          awayTeamId: ids[b],
          status: 'finished',
          homeScore: 2,
          awayScore: 0,
        });
      }
    }
  }

  matches.push({ id: 'final', stage: 'final', group: null, homeTeamId: '0', awayTeamId: '4', status: 'finished', homeScore: 1, awayScore: 0 });
  matches.push({ id: 'bronze', stage: 'bronze', group: null, homeTeamId: '8', awayTeamId: '12', status: 'finished', homeScore: 2, awayScore: 1 });

  return { teams, matches };
}

/** A prediction that matches reality exactly, derived from the engine's own facts. */
function perfectPrediction(teams: Team[], matches: Match[]): Prediction {
  const bonus: Partial<Record<BonusKey, string>> = {};
  const winners = groupWinners(GROUP_IDS, teams, matches);
  for (const g of GROUP_IDS) bonus[`group_winner_${g}`] = winners.get(g)!;
  bonus.most_goals = mostGoalsTeams(teams, matches)[0];
  bonus.fewest_goals = fewestGoalsTeams(teams, matches)[0];
  const fin = finalists(matches);
  bonus.finalist_1 = fin[0];
  bonus.finalist_2 = fin[1];
  bonus.champion = champion(matches)!;
  bonus.bronze = bronzeWinner(matches)!;

  const matchPicks: Record<string, Pick> = {};
  for (const m of matches) {
    if (m.stage === 'group') matchPicks[m.id] = matchOutcome(m)!;
  }

  return { userId: 'perfect', matchPicks, bonus };
}

describe('scoring self-test', () => {
  it('a perfect prediction scores exactly 168 (72 match + 96 bonus)', () => {
    const { teams, matches } = buildFinishedTournament();
    expect(matches.filter((m) => m.stage === 'group').length).toBe(72);

    const pred = perfectPrediction(teams, matches);
    const [score] = computeScores({ teams, matches, predictions: [pred] });

    expect(score.matchPoints).toBe(72);
    expect(score.bonusPoints).toBe(96);
    expect(score.totalPoints).toBe(168);
    expect(score.totalPoints).toBe(MAX_POINTS);
  });
});
