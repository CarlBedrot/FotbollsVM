import type { Match } from '../domain/types';
import type { MatchRepository, MatchResultInput } from './matchRepository';

export class InMemoryMatchRepository implements MatchRepository {
  constructor(private matches: Match[]) {}

  async all(): Promise<Match[]> {
    return this.matches.map((m) => ({ ...m }));
  }

  async setResult(matchId: string, result: MatchResultInput): Promise<void> {
    const m = this.matches.find((x) => x.id === matchId);
    if (!m) throw new Error(`unknown match: ${matchId}`);
    m.homeScore = result.homeScore;
    m.awayScore = result.awayScore;
    m.status = 'finished';
  }
}
