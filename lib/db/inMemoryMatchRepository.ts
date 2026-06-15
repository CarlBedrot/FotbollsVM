import type { Match } from '../domain/types';
import type { LiveScoreInput, MatchRepository, MatchResultInput, MatchTeamsInput } from './matchRepository';

export class InMemoryMatchRepository implements MatchRepository {
  constructor(private matches: Match[]) {}

  async all(): Promise<Match[]> {
    return this.matches.map((m) => ({ ...m }));
  }

  async setResult(matchId: string, result: MatchResultInput): Promise<void> {
    const m = this.find(matchId);
    m.homeScore = result.homeScore;
    m.awayScore = result.awayScore;
    m.status = 'finished';
  }

  async setTeams(matchId: string, teams: MatchTeamsInput): Promise<void> {
    const m = this.find(matchId);
    m.homeTeamId = teams.homeTeamId;
    m.awayTeamId = teams.awayTeamId;
  }

  async setLiveScore(matchId: string, score: LiveScoreInput): Promise<void> {
    const m = this.find(matchId);
    m.homeScore = score.homeScore;
    m.awayScore = score.awayScore;
    m.status = 'live';
  }

  private find(matchId: string): Match {
    const m = this.matches.find((x) => x.id === matchId);
    if (!m) throw new Error(`unknown match: ${matchId}`);
    return m;
  }
}
