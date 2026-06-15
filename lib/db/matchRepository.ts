import type { Match } from "../domain/types";

export interface MatchResultInput {
  homeScore: number;
  awayScore: number;
  source: "manual" | "api";
  updatedBy: string | null;
}

export interface MatchTeamsInput {
  homeTeamId: string;
  awayTeamId: string;
}

export interface LiveScoreInput {
  homeScore: number;
  awayScore: number;
}

export interface MatchRepository {
  all(): Promise<Match[]>;
  setResult(matchId: string, result: MatchResultInput): Promise<void>;
  /** Assign real teams to a knockout slot once the bracket resolves. */
  setTeams(matchId: string, teams: MatchTeamsInput): Promise<void>;
  /** Store the current score of an in-play match (status becomes 'live'). */
  setLiveScore(matchId: string, score: LiveScoreInput): Promise<void>;
}
