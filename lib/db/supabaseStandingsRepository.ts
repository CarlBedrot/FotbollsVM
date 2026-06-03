import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoreBreakdown } from '../domain/types';
import type { Standing } from '../results/types';
import type { StandingsRepository } from './standingsRepository';

interface StandingRow {
  user_id: string;
  rank: number;
  prev_rank: number | null;
  total_points: number;
  match_points: number;
  bonus_points: number;
  breakdown: ScoreBreakdown;
}

export class SupabaseStandingsRepository implements StandingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getAll(): Promise<Standing[]> {
    const { data, error } = await this.db.from('standings').select('*');
    if (error) throw new Error(error.message);
    return (data as StandingRow[]).map((r) => ({
      userId: r.user_id,
      rank: r.rank,
      prevRank: r.prev_rank,
      totalPoints: r.total_points,
      matchPoints: r.match_points,
      bonusPoints: r.bonus_points,
      breakdown: r.breakdown,
    }));
  }

  async replaceAll(standings: Standing[]): Promise<void> {
    const rows = standings.map((s) => ({
      user_id: s.userId,
      rank: s.rank,
      prev_rank: s.prevRank,
      total_points: s.totalPoints,
      match_points: s.matchPoints,
      bonus_points: s.bonusPoints,
      breakdown: s.breakdown,
      computed_at: new Date().toISOString(),
    }));
    const { error } = await this.db.from('standings').upsert(rows, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  }
}
