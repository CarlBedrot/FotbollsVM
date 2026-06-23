import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from "./pushSubscriptionRepository";

interface Row {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
}

function toRecord(row: Row): PushSubscriptionRecord {
  return {
    endpoint: row.endpoint,
    userId: row.user_id,
    p256dh: row.p256dh,
    auth: row.auth,
  };
}

export class SupabasePushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getAll(): Promise<PushSubscriptionRecord[]> {
    const { data, error } = await this.db
      .from("push_subscriptions")
      .select("endpoint, user_id, p256dh, auth");
    if (error) throw new Error(error.message);
    return (data as Row[]).map(toRecord);
  }

  async upsert(record: PushSubscriptionRecord): Promise<void> {
    const { error } = await this.db.from("push_subscriptions").upsert(
      {
        endpoint: record.endpoint,
        user_id: record.userId,
        p256dh: record.p256dh,
        auth: record.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    const { error } = await this.db
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
  }
}
