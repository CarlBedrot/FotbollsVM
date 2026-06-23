/** A single browser/device push channel. `endpoint` is globally unique and is
 *  the natural primary key the Push API hands us. */
export interface PushSubscriptionRecord {
  endpoint: string;
  userId: string;
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRepository {
  getAll(): Promise<PushSubscriptionRecord[]>;
  /** Idempotent: re-subscribing the same endpoint updates its keys/owner. */
  upsert(record: PushSubscriptionRecord): Promise<void>;
  /** Used both for user-initiated unsubscribe and pruning dead endpoints. */
  deleteByEndpoint(endpoint: string): Promise<void>;
}
