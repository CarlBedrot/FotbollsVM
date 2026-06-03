import type {
  GroupId, Pick, Prediction, RankedScore, ScoreBreakdown, ScoringInput, UserScore,
} from '../domain/types';
import { RULES, GROUP_IDS } from '../domain/rules';
import { matchOutcome } from './outcome';
import { groupWinners, isGroupComplete } from './groupTable';
import { mostGoalsTeams, fewestGoalsTeams } from './goals';
import { finalists, champion, bronzeWinner } from './knockout';

function emptyBreakdown(): ScoreBreakdown {
  return {
    matchPoints: 0,
    groupWinnerPoints: 0,
    mostGoalsPoints: 0,
    fewestGoalsPoints: 0,
    finalistPoints: 0,
    bronzePoints: 0,
    championPoints: 0,
  };
}

export function computeScores(input: ScoringInput): UserScore[] {
  const { teams, matches, predictions } = input;

  // Facts shared by all users (computed once).
  const outcomes = new Map<string, Pick | null>();
  for (const m of matches) outcomes.set(m.id, matchOutcome(m));

  const winners = groupWinners(GROUP_IDS, teams, matches);
  const allGroupsComplete = GROUP_IDS.every((g) => isGroupComplete(g, teams, matches));
  const mostSet = allGroupsComplete ? new Set(mostGoalsTeams(teams, matches)) : new Set<string>();
  const fewestSet = allGroupsComplete ? new Set(fewestGoalsTeams(teams, matches)) : new Set<string>();
  const finalTeams = new Set(finalists(matches));
  const champ = champion(matches);
  const bronze = bronzeWinner(matches);

  return predictions.map((p) => scoreUser(p, outcomes, winners, mostSet, fewestSet, finalTeams, champ, bronze));
}

function scoreUser(
  p: Prediction,
  outcomes: Map<string, Pick | null>,
  winners: Map<GroupId, string>,
  mostSet: Set<string>,
  fewestSet: Set<string>,
  finalTeams: Set<string>,
  champ: string | null,
  bronze: string | null,
): UserScore {
  const b = emptyBreakdown();

  for (const [matchId, pick] of Object.entries(p.matchPicks)) {
    if (outcomes.get(matchId) === pick) b.matchPoints += RULES.matchPoint;
  }

  for (const g of GROUP_IDS) {
    const predicted = p.bonus[`group_winner_${g}`];
    if (predicted && winners.get(g) === predicted) b.groupWinnerPoints += RULES.groupWinnerPoint;
  }

  if (p.bonus.most_goals && mostSet.has(p.bonus.most_goals)) b.mostGoalsPoints += RULES.mostGoalsPoint;
  if (p.bonus.fewest_goals && fewestSet.has(p.bonus.fewest_goals)) b.fewestGoalsPoints += RULES.fewestGoalsPoint;

  const finalistPicks = new Set(
    [p.bonus.finalist_1, p.bonus.finalist_2].filter((x): x is string => Boolean(x)),
  );
  for (const pick of finalistPicks) {
    if (finalTeams.has(pick)) b.finalistPoints += RULES.finalistPoint;
  }

  if (p.bonus.bronze && bronze === p.bonus.bronze) b.bronzePoints += RULES.bronzePoint;
  if (p.bonus.champion && champ === p.bonus.champion) b.championPoints += RULES.championPoint;

  const bonusPoints =
    b.groupWinnerPoints + b.mostGoalsPoints + b.fewestGoalsPoints +
    b.finalistPoints + b.bronzePoints + b.championPoints;

  return {
    userId: p.userId,
    matchPoints: b.matchPoints,
    bonusPoints,
    totalPoints: b.matchPoints + bonusPoints,
    breakdown: b,
  };
}

export interface TieData {
  submittedAt: number;
}

/** Rank by total → exact 1/X/2 count (matchPoints) → earliest submission → userId. */
export function rankScores(scores: UserScore[], tie: Record<string, TieData>): RankedScore[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    const sa = tie[a.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER;
    const sb = tie[b.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });

  const ranked: RankedScore[] = [];
  sorted.forEach((s, i) => {
    let rank = i + 1;
    if (i > 0) {
      const prev = sorted[i - 1];
      // Shared placing only when every meaningful key is equal (userId is just a
      // deterministic display order, not a real difference).
      const sameKey =
        prev.totalPoints === s.totalPoints &&
        prev.matchPoints === s.matchPoints &&
        (tie[prev.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER) ===
          (tie[s.userId]?.submittedAt ?? Number.MAX_SAFE_INTEGER);
      if (sameKey) rank = ranked[i - 1].rank;
    }
    ranked.push({ ...s, rank });
  });
  return ranked;
}
