import type { TeamStatusRepository } from './teamStatusRepository';

export class InMemoryTeamStatusRepository implements TeamStatusRepository {
  private eliminated = new Set<string>();
  async getEliminated(): Promise<string[]> {
    return [...this.eliminated];
  }
  async setEliminated(teamId: string, eliminated: boolean): Promise<void> {
    if (eliminated) this.eliminated.add(teamId);
    else this.eliminated.delete(teamId);
  }
}
