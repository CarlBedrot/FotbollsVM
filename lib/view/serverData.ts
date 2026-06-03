import { loadFixtures } from '../fixtures/load';
import { getStandingsRepository, getUserRepository, getMatchRepository } from '../db/repository';
import { mergeStandings, type StandingView } from './standingsView';
import { toMatchViews, type MatchView } from './matchView';

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
