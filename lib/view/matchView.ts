import type { Match, Pick } from '../domain/types';
import type { Fixtures } from '../fixtures/types';
import { matchOutcome } from '../scoring/outcome';

export interface MatchView {
  id: string;
  stage: string;
  group: string | null;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  outcome: Pick | null;
}

export function toMatchViews(dbMatches: Match[], fixtures: Fixtures): MatchView[] {
  const byId = new Map(dbMatches.map((m) => [m.id, m]));
  return fixtures.matches.map((f) => {
    const db = byId.get(f.id);
    const merged: Match = db ?? {
      id: f.id, stage: f.stage, group: f.group,
      homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId,
      status: 'scheduled', homeScore: null, awayScore: null,
    };
    return {
      id: f.id, stage: f.stage, group: f.group,
      homeLabel: f.homeLabel, awayLabel: f.awayLabel, kickoff: f.kickoff,
      status: merged.status, homeScore: merged.homeScore, awayScore: merged.awayScore,
      outcome: matchOutcome(merged),
    };
  });
}
