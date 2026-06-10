import type { GroupId, Pick } from '../domain/types';
import { GROUP_IDS } from '../domain/rules';
import type { Fixtures } from '../fixtures/types';
import { groupMatches, teamsById } from '../fixtures/load';
import type { StoredPrediction } from '../db/predictionRepository';

export interface MyTipsMatch {
  id: string;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  pick: Pick | null;
  /** What the pick means: the picked team's name, or 'Oavgjort' for X. */
  pickedLabel: string | null;
}

export interface MyTipsGroup {
  group: GroupId;
  matches: MyTipsMatch[];
}

export interface MyTips {
  pickCount: number;
  bonusCount: number;
  groups: MyTipsGroup[];
  groupWinners: Array<{ group: GroupId; teamName: string | null }>;
  mostGoals: string | null;
  fewestGoals: string | null;
  finalist1: string | null;
  finalist2: string | null;
  bronze: string | null;
  champion: string | null;
}

/** The player's own saved tips, resolved to labels for display. Null when nothing is saved. */
export function buildMyTips(prediction: StoredPrediction | null, fixtures: Fixtures): MyTips | null {
  if (!prediction) return null;
  const byId = teamsById(fixtures);
  const teamName = (id: string | undefined): string | null => (id ? byId.get(id)?.name ?? null : null);

  const groups: MyTipsGroup[] = GROUP_IDS.map((g) => ({
    group: g,
    matches: groupMatches(fixtures)
      .filter((m) => m.group === g)
      .map((m) => {
        const pick = prediction.matchPicks[m.id] ?? null;
        const pickedLabel = pick === '1' ? m.homeLabel : pick === '2' ? m.awayLabel : pick === 'X' ? 'Oavgjort' : null;
        return { id: m.id, homeLabel: m.homeLabel, awayLabel: m.awayLabel, kickoff: m.kickoff, pick, pickedLabel };
      }),
  })).filter((g) => g.matches.length > 0);

  return {
    pickCount: Object.keys(prediction.matchPicks).length,
    bonusCount: Object.keys(prediction.bonus).length,
    groups,
    groupWinners: GROUP_IDS.map((g) => ({ group: g, teamName: teamName(prediction.bonus[`group_winner_${g}`]) })),
    mostGoals: teamName(prediction.bonus.most_goals),
    fewestGoals: teamName(prediction.bonus.fewest_goals),
    finalist1: teamName(prediction.bonus.finalist_1),
    finalist2: teamName(prediction.bonus.finalist_2),
    bronze: teamName(prediction.bonus.bronze),
    champion: teamName(prediction.bonus.champion),
  };
}
