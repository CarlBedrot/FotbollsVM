import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamStatusRepository } from './teamStatusRepository';

interface EliminatedRow {
  team_id: string;
}

export class SupabaseTeamStatusRepository implements TeamStatusRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getEliminated(): Promise<string[]> {
    const { data, error } = await this.db.from('eliminated_teams').select('team_id');
    if (error) throw new Error(error.message);
    return (data as EliminatedRow[]).map((r) => r.team_id);
  }

  async setEliminated(teamId: string, eliminated: boolean): Promise<void> {
    if (eliminated) {
      const { error } = await this.db.from('eliminated_teams').upsert({ team_id: teamId }, { onConflict: 'team_id' });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this.db.from('eliminated_teams').delete().eq('team_id', teamId);
      if (error) throw new Error(error.message);
    }
  }
}
