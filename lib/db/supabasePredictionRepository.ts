import type { SupabaseClient } from '@supabase/supabase-js';
import type { BonusKey, Pick } from '../domain/types';
import type { PredictionRepository, PredictionStatus, StoredPrediction } from './predictionRepository';

export class SupabasePredictionRepository implements PredictionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async save(prediction: StoredPrediction, submittedAt: string): Promise<void> {
    const { userId, matchPicks, bonus } = prediction;
    await this.db.from('prediction_matches').delete().eq('user_id', userId);
    await this.db.from('prediction_bonus').delete().eq('user_id', userId);

    const matchRows = Object.entries(matchPicks).map(([match_id, pick]) => ({ user_id: userId, match_id, pick }));
    if (matchRows.length) {
      const { error } = await this.db.from('prediction_matches').insert(matchRows);
      if (error) throw new Error(error.message);
    }
    const bonusRows = Object.entries(bonus).map(([bonus_key, team_id]) => ({ user_id: userId, bonus_key, team_id }));
    if (bonusRows.length) {
      const { error } = await this.db.from('prediction_bonus').insert(bonusRows);
      if (error) throw new Error(error.message);
    }
    const { error: stErr } = await this.db
      .from('prediction_status')
      .upsert({ user_id: userId, submitted: true, submitted_at: submittedAt }, { onConflict: 'user_id' });
    if (stErr) throw new Error(stErr.message);
  }

  async get(userId: string): Promise<StoredPrediction | null> {
    const [{ data: mrows, error: me }, { data: brows, error: be }] = await Promise.all([
      this.db.from('prediction_matches').select('match_id,pick').eq('user_id', userId),
      this.db.from('prediction_bonus').select('bonus_key,team_id').eq('user_id', userId),
    ]);
    if (me) throw new Error(me.message);
    if (be) throw new Error(be.message);
    if ((!mrows || mrows.length === 0) && (!brows || brows.length === 0)) return null;
    const matchPicks: Record<string, Pick> = {};
    for (const r of mrows ?? []) matchPicks[r.match_id as string] = r.pick as Pick;
    const bonus: Partial<Record<BonusKey, string>> = {};
    for (const r of brows ?? []) bonus[r.bonus_key as BonusKey] = r.team_id as string;
    return { userId, matchPicks, bonus };
  }

  async getStatus(userId: string): Promise<PredictionStatus | null> {
    const { data, error } = await this.db
      .from('prediction_status')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      userId,
      submitted: data.submitted as boolean,
      submittedAt: (data.submitted_at as string | null) ?? null,
      unlockedByAdmin: data.unlocked_by_admin as boolean,
    };
  }

  async setUnlock(userId: string, unlocked: boolean): Promise<void> {
    const { error } = await this.db
      .from('prediction_status')
      .upsert({ user_id: userId, unlocked_by_admin: unlocked }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  }

  async all(): Promise<StoredPrediction[]> {
    const [{ data: mrows, error: me }, { data: brows, error: be }] = await Promise.all([
      this.db.from('prediction_matches').select('user_id,match_id,pick'),
      this.db.from('prediction_bonus').select('user_id,bonus_key,team_id'),
    ]);
    if (me) throw new Error(me.message);
    if (be) throw new Error(be.message);
    const map = new Map<string, StoredPrediction>();
    const get = (uid: string) => {
      let p = map.get(uid);
      if (!p) { p = { userId: uid, matchPicks: {}, bonus: {} }; map.set(uid, p); }
      return p;
    };
    for (const r of mrows ?? []) get(r.user_id as string).matchPicks[r.match_id as string] = r.pick as Pick;
    for (const r of brows ?? []) get(r.user_id as string).bonus[r.bonus_key as BonusKey] = r.team_id as string;
    return [...map.values()];
  }
}
