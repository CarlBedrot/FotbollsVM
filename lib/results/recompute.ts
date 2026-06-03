import type { Team, TieData } from '../domain/types';
import type { MatchRepository } from '../db/matchRepository';
import type { StandingsRepository } from '../db/standingsRepository';
import type { PredictionRepository } from '../db/predictionRepository';
import { buildStandings } from './buildStandings';
import type { Standing } from './types';

export interface RecomputeDeps {
  teams: Team[];
  matchRepo: MatchRepository;
  standingsRepo: StandingsRepository;
  predRepo: PredictionRepository;
}

export async function recomputeStandings(deps: RecomputeDeps): Promise<Standing[]> {
  const { teams, matchRepo, standingsRepo, predRepo } = deps;
  const [matches, predictions, prev] = await Promise.all([
    matchRepo.all(),
    predRepo.all(),
    standingsRepo.getAll(),
  ]);

  const prevRankByUser: Record<string, number> = {};
  for (const s of prev) prevRankByUser[s.userId] = s.rank;

  const tie: Record<string, TieData> = {};
  await Promise.all(
    predictions.map(async (p) => {
      const status = await predRepo.getStatus(p.userId);
      tie[p.userId] = { submittedAt: status?.submittedAt ? new Date(status.submittedAt).getTime() : Number.MAX_SAFE_INTEGER };
    }),
  );

  const standings = buildStandings({ teams, matches, predictions }, tie, prevRankByUser);
  await standingsRepo.replaceAll(standings);
  return standings;
}
