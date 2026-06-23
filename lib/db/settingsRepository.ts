import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigestSnapshot } from "../push/digest";

export interface SettingsRepository {
  getLockAt(): Promise<string | null>;
  /** Last morning-digest snapshot, or null before the first push. */
  getLastDigest(): Promise<DigestSnapshot | null>;
  setLastDigest(snapshot: DigestSnapshot): Promise<void>;
}

export class SupabaseSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getLockAt(): Promise<string | null> {
    const { data, error } = await this.db
      .from("settings")
      .select("lock_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.lock_at as string | null) ?? null;
  }

  async getLastDigest(): Promise<DigestSnapshot | null> {
    const { data, error } = await this.db
      .from("settings")
      .select("last_digest")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.last_digest as DigestSnapshot | null) ?? null;
  }

  async setLastDigest(snapshot: DigestSnapshot): Promise<void> {
    const { error } = await this.db
      .from("settings")
      .update({ last_digest: snapshot })
      .eq("id", 1);
    if (error) throw new Error(error.message);
  }
}
