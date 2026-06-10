import { loadFixtures, groupMatches } from '../fixtures/load';
import { loadOdds } from '../odds/load';
import { getStandingsRepository, getUserRepository, getMatchRepository, getPredictionRepository } from '../db/repository';
import { mergeStandings, type StandingView } from './standingsView';
import { toMatchViews, type MatchView } from './matchView';
import { buildDailyOverview, dayKeyInTz, type DailyOverview } from './dailyPredictions';
import {
  oddsDistance, bestOddsHits, pickDistribution, winnerBoard,
  type OddsDistanceRow, type OddsHit, type PickSplit, type WinnerBoard,
} from './extraStats';
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
  hasOdds: boolean;
  oddsSource: string;
  distance: OddsDistanceRow[];
  hits: OddsHit[];
  split: PickSplit;
  winners: WinnerBoard;
}

const EMPTY_SPLIT: PickSplit = { rows: [], total: { counts: { '1': 0, X: 0, '2': 0 }, total: 0 } };

/** Odds distance, best odds hit, 1/X/2 split and winner picks for the stats page. */
export async function loadExtraStats(now: Date = new Date()): Promise<ExtraStatsData> {
  const fixtures = loadFixtures();
  const book = loadOdds();
  const hasOdds = Object.keys(book.matchOdds).length > 0;
  const revealed = isLocked(fixtures.firstKickoff, now, null);
  if (!revealed) {
    return {
      revealed, hasOdds, oddsSource: book.source,
      distance: [], hits: [], split: EMPTY_SPLIT,
      winners: { champion: [], finalists: [], bronze: [] },
    };
  }

  const [predictions, users, standings, matchViews] = await Promise.all([
    safe(() => getPredictionRepository().all(), []),
    safe(() => getUserRepository().list(), []),
    safe(() => getStandingsRepository().getAll(), []),
    loadMatchViews(),
  ]);
  // Present players in standings order when there is one, otherwise by name.
  const rankById = new Map(standings.map((s) => [s.userId, s.rank]));
  const ordered = [...users].sort(
    (a, b) => (rankById.get(a.id) ?? 99) - (rankById.get(b.id) ?? 99) || a.displayName.localeCompare(b.displayName, 'sv'),
  );

  return {
    revealed,
    hasOdds,
    oddsSource: book.source,
    distance: oddsDistance(predictions, ordered, book),
    hits: bestOddsHits(predictions, ordered, matchViews, book),
    split: pickDistribution(predictions, ordered),
    winners: winnerBoard(predictions, ordered, fixtures.teams),
  };
}
