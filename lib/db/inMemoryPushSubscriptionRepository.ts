import type {
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from "./pushSubscriptionRepository";

export class InMemoryPushSubscriptionRepository implements PushSubscriptionRepository {
  private byEndpoint = new Map<string, PushSubscriptionRecord>();

  async getAll(): Promise<PushSubscriptionRecord[]> {
    return [...this.byEndpoint.values()].map((r) => ({ ...r }));
  }

  async upsert(record: PushSubscriptionRecord): Promise<void> {
    this.byEndpoint.set(record.endpoint, { ...record });
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    this.byEndpoint.delete(endpoint);
  }
}
