import type { Match, Pick } from "../domain/types";
import type { Fixtures } from "../fixtures/types";
import { matchOutcome } from "../scoring/outcome";

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

export function toMatchViews(
  dbMatches: Match[],
  fixtures: Fixtures,
): MatchView[] {
  const byId = new Map(dbMatches.map((m) => [m.id, m]));
  const teamName = new Map(fixtures.teams.map((t) => [t.id, t.name]));
  return (
    fixtures.matches
      .map((f) => {
        const db = byId.get(f.id);
        const merged: Match = db ?? {
          id: f.id,
          stage: f.stage,
          group: f.group,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId,
          status: "scheduled",
          homeScore: null,
          awayScore: null,
        };
        return {
          id: f.id,
          stage: f.stage,
          group: f.group,
          // Knockout-platshållare ("2A", "W73") ersätts med riktiga lagnamn
          // så fort syncen har parat ihop slotten med lag i databasen.
          homeLabel:
            (merged.homeTeamId && teamName.get(merged.homeTeamId)) ||
            f.homeLabel,
          awayLabel:
            (merged.awayTeamId && teamName.get(merged.awayTeamId)) ||
            f.awayLabel,
          kickoff: f.kickoff,
          status: merged.status,
          homeScore: merged.homeScore,
          awayScore: merged.awayScore,
          outcome: matchOutcome(merged),
        };
      })
      // Fixtures ligger grupp för grupp; presentera kronologiskt (kickoff är UTC-ISO → lexikografisk = tidsordning).
      .sort(
        (a, b) =>
          a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id),
      )
  );
}
