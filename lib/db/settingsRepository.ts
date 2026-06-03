import type { SupabaseClient } from '@supabase/supabase-js';

export interface SettingsRepository {
  getLockAt(): Promise<string | null>;
}

export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SupabaseClient) {}
  async getLockAt(): Promise<string | null> {
    const { data, error } = await this.db.from('settings').select('lock_at').eq('id', 1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.lock_at as string | null) ?? null;
  }
}
