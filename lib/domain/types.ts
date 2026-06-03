export type GroupId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'bronze' | 'final';

export type Pick = '1' | 'X' | '2';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Team {
  id: string;
  name: string;
  group: GroupId;
}

export interface Match {
  id: string;
  stage: Stage;
  group: GroupId | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

export type GroupWinnerKey = `group_winner_${GroupId}`;

export type BonusKey =
  | GroupWinnerKey
  | 'most_goals'
  | 'fewest_goals'
  | 'finalist_1'
  | 'finalist_2'
  | 'bronze'
  | 'champion';

export interface Prediction {
  userId: string;
  matchPicks: Record<string, Pick>;
  bonus: Partial<Record<BonusKey, string>>;
}

export interface ScoreBreakdown {
  matchPoints: number;
  groupWinnerPoints: number;
  mostGoalsPoints: number;
  fewestGoalsPoints: number;
  finalistPoints: number;
  bronzePoints: number;
  championPoints: number;
}

export interface UserScore {
  userId: string;
  matchPoints: number;
  bonusPoints: number;
  totalPoints: number;
  breakdown: ScoreBreakdown;
}

export interface RankedScore extends UserScore {
  rank: number;
}

export interface ScoringInput {
  teams: Team[];
  matches: Match[];
  predictions: Prediction[];
}

/** Per-user submission metadata used as a leaderboard tiebreaker. */
export interface TieData {
  submittedAt: number;
}
