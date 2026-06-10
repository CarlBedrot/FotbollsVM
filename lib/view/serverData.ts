import { loadFixtures, groupMatches } from '../fixtures/load';
import { getStandingsRepository, getUserRepository, getMatchRepository, getPredictionRepository } from '../db/repository';
import { mergeStandings, type StandingView } from './standingsView';
import { toMatchViews, type MatchView } from './matchView';
import { buildDailyOverview, dayKeyInTz, type DailyOverview } from './dailyPredictions';
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
