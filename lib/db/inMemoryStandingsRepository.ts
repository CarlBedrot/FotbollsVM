import type { Standing } from '../results/types';
import type { StandingsRepository } from './standingsRepository';

export class InMemoryStandingsRepository implements StandingsRepository {
  private standings: Standing[] = [];
  async getAll(): Promise<Standing[]> {
    return this.standings.map((s) => ({ ...s }));
  }
  async replaceAll(standings: Standing[]): Promise<void> {
    this.standings = standings.map((s) => ({ ...s }));
  }
}
