import { loadFixtures, groupMatches } from '../fixtures/load';
import { getStandingsRepository, getUserRepository, getMatchRepository, getPredictionRepository, getTeamStatusRepository } from '../db/repository';
import { mergeStandings, type StandingView } from './standingsView';
import { computeRemaining, pickedKnockoutTeamIds } from '../scoring/remaining';
import { buildRemainingRows, decidedFromMatches, type RemainingRow } from './remainingView';
import { buildGoalsFacit, type GoalsFacit } from './goalsFacit';
import { toMatchViews, type MatchView } from './matchView';
import { buildDailyOverview, dayKeyInTz, type DailyOverview } from './dailyPredictions';
import { pickDistribution, winnerBoard, type PickSplit, type WinnerBoard } from './extraStats';
import { buildPointsTimeline, type MatchMeta, type PointsTimeline } from './pointsTimeline';
import { isLocked } from '../tips/lock';

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function loadStandingsView(): Promise<StandingView[]> {
  const [standings, users] = await Promise.all([
    safe(() => getStandingsRepository().getAll(), []),
    safe(() => getUserRepository().list(), []),
  ]);
  return mergeStandings(standings, users);
}

export async function loadMatchViews(): Promise<MatchView[]> {
  const dbMatches = await safe(() => getMatchRepository().all(), []);
  return toMatchViews(dbMatches, loadFixtures());
}

/** What everyone predicted for today's group matches (revealed only after the lock). */
export async function loadDailyOverview(now: Date = new Date()): Promise<DailyOverview> {
  const fixtures = loadFixtures();
  const [predictions, users] = await Promise.all([
    safe(() => getPredictionRepository().all(), []),
    safe(() => getUserRepository().list(), []),
  ]);
  const matches = groupMatches(fixtures).map((m) => ({
    id: m.id, homeLabel: m.homeLabel, awayLabel: m.awayLabel, kickoff: m.kickoff,
  }));
  return buildDailyOverview({
    matches,
    predictions,
    users: users.map((u) => ({ id: u.id, displayName: u.displayName, color: u.color, avatarUrl: u.avatarUrl })),
    todayKey: dayKeyInTz(now.toISOString()),
    // Reveal is global at first kickoff — pass null status so per-user admin
    // unlocks don't gate it (same lock rule the write path uses).
    revealed: isLocked(fixtures.firstKickoff, now, null),
  });
}

export interface ExtraStatsData {
  /** Individual picks stay secret until the lock — before that everything below is empty. */
  revealed: boolean;
  split: PickSplit;
  winners: WinnerBoard;
}

const EMPTY_SPLIT: PickSplit = { rows: [], total: { counts: { '1': 0, X: 0, '2': 0 }, total: 0 } };

/** 1/X/2 split and winner picks for the stats page. */
export async function loadExtraStats(now: Date = new Date()): Promise<ExtraStatsData> {
  const fixtures = loadFixtures();
  const revealed = isLocked(fixtures.firstKickoff, now, null);
  if (!revealed) {
    return { revealed, split: EMPTY_SPLIT, winners: { champion: [], finalists: [], bronze: [] } };
  }

  const [predictions, users, standings] = await Promise.all([
    safe(() => getPredictionRepository().all(), []),
    safe(() => getUserRepository().list(), []),
    safe(() => getStandingsRepository().getAll(), []),
  ]);
  // Present players in standings order when there is one, otherwise by name.
  const rankById = new Map(standings.map((s) => [s.userId, s.rank]));
  const ordered = [...users].sort(
    (a, b) => (rankById.get(a.id) ?? 99) - (rankById.get(b.id) ?? 99) || a.displayName.localeCompare(b.displayName, 'sv'),
  );

  return {
    revealed,
    split: pickDistribution(predictions, ordered),
    winners: winnerBoard(predictions, ordered, fixtures.teams),
  };
}

/** Cumulative total points per player after each finished match, for the graph. */
export async function loadPointsTimeline(): Promise<PointsTimeline> {
  const fixtures = loadFixtures();
  const [matches, predictions] = await Promise.all([
    safe(() => getMatchRepository().all(), []),
    safe(() => getPredictionRepository().all(), []),
  ]);
  const meta: MatchMeta = {};
  for (const m of fixtures.matches) {
    meta[m.id] = { kickoff: m.kickoff, label: `${m.homeLabel}–${m.awayLabel}` };
  }
  return buildPointsTimeline({ teams: fixtures.teams, matches, predictions }, meta);
}

/** Per-player "points still up for grabs" from the four knockout bonuses. */
export async function loadRemaining(): Promise<RemainingRow[]> {
  const fixtures = loadFixtures();
  const [standings, users, predictions, matches, eliminated] = await Promise.all([
    safe(() => getStandingsRepository().getAll(), []),
    safe(() => getUserRepository().list(), []),
    safe(() => getPredictionRepository().all(), []),
    safe(() => getMatchRepository().all(), []),
    safe(() => getTeamStatusRepository().getEliminated(), []),
  ]);
  const remaining = computeRemaining({
    predictions: predictions.map((p) => ({ userId: p.userId, bonus: p.bonus })),
    eliminatedTeamIds: eliminated,
    decided: decidedFromMatches(matches),
  });
  const nameById = new Map(fixtures.teams.map((t) => [t.id, t.name]));
  return buildRemainingRows(mergeStandings(standings, users), remaining, (id) => nameById.get(id) ?? id);
}

/** Group-stage most/fewest-goals result for the stats page. */
export async function loadGoalsFacit(): Promise<GoalsFacit> {
  const fixtures = loadFixtures();
  const matches = await safe(() => getMatchRepository().all(), []);
  return buildGoalsFacit(fixtures.teams, matches);
}

export interface EliminationEntry {
  teamId: string;
  teamName: string;
  eliminated: boolean;
}

/** The knockout-picked teams admin can toggle alive/eliminated. */
export async function loadEliminationBoard(): Promise<EliminationEntry[]> {
  const fixtures = loadFixtures();
  const [predictions, eliminated] = await Promise.all([
    safe(() => getPredictionRepository().all(), []),
    safe(() => getTeamStatusRepository().getEliminated(), []),
  ]);
  const elimSet = new Set(eliminated);
  const nameById = new Map(fixtures.teams.map((t) => [t.id, t.name]));
  const ids = pickedKnockoutTeamIds(predictions.map((p) => ({ userId: p.userId, bonus: p.bonus })));
  return ids
    .map((id) => ({ teamId: id, teamName: nameById.get(id) ?? id, eliminated: elimSet.has(id) }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName, 'sv'));
}
