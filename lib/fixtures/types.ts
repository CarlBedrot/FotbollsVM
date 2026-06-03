import type { GroupId, Stage } from '../domain/types';

export interface FixtureTeam {
  id: string;
  name: string;
  group: GroupId;
}

export interface FixtureMatch {
  id: string;
  stage: Stage;
  group: GroupId | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string;
  awayLabel: string;
  kickoff: string; // ISO UTC
  ground: string;
}

export interface Fixtures {
  season: string;
  firstKickoff: string; // ISO UTC of earliest group match → used as the lock time
  teams: FixtureTeam[];
  matches: FixtureMatch[];
}
