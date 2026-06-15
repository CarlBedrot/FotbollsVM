import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupId, Match, MatchStatus, Stage } from "../domain/types";
import type {
  LiveScoreInput,
  MatchRepository,
  MatchResultInput,
  MatchTeamsInput,
} from "./matchRepository";

interface MatchRow {
  id: string;
  stage: string;
  group: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export function mapMatchRow(r: MatchRow): Match {
  return {
    id: r.id,
    stage: r.stage as Stage,
    group: (r.group as GroupId | null) ?? null,
    homeTeamId: r.home_team_id,
    awayTeamId: r.away_team_id,
    status: r.status as MatchStatus,
    homeScore: r.home_score,
    awayScore: r.away_score,
  };
}

export class SupabaseMatchRepository implements MatchRepository {
  constructor(private readonly db: SupabaseClient) {}

  async all(): Promise<Match[]> {
    const { data, error } = await this.db
      .from("matches")
      .select(
        "id,stage,group,home_team_id,away_team_id,status,home_score,away_score",
      );
    if (error) throw new Error(error.message);
    return (data as MatchRow[]).map(mapMatchRow);
  }

  async setResult(matchId: string, result: MatchResultInput): Promise<void> {
    const { error } = await this.db
      .from("matches")
      .update({
        home_score: result.homeScore,
        away_score: result.awayScore,
        status: "finished",
        result_source: result.source,
        updated_by: result.updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);
    if (error) throw new Error(error.message);
  }

  async setTeams(matchId: string, teams: MatchTeamsInput): Promise<void> {
    const { error } = await this.db
      .from("matches")
      .update({
        home_team_id: teams.homeTeamId,
        away_team_id: teams.awayTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);
    if (error) throw new Error(error.message);
  }

  async setLiveScore(matchId: string, score: LiveScoreInput): Promise<void> {
    const { error } = await this.db
      .from("matches")
      .update({
        home_score: score.homeScore,
        away_score: score.awayScore,
        status: "live",
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);
    if (error) throw new Error(error.message);
  }
}
