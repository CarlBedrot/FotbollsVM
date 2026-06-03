import type { PredictionRepository, PredictionStatus, StoredPrediction } from './predictionRepository';

export class InMemoryPredictionRepository implements PredictionRepository {
  private byUser = new Map<string, StoredPrediction>();
  private status = new Map<string, PredictionStatus>();

  async save(prediction: StoredPrediction, submittedAt: string): Promise<void> {
    this.byUser.set(prediction.userId, {
      userId: prediction.userId,
      matchPicks: { ...prediction.matchPicks },
      bonus: { ...prediction.bonus },
    });
    const prev = this.status.get(prediction.userId);
    this.status.set(prediction.userId, {
      userId: prediction.userId,
      submitted: true,
      submittedAt,
      unlockedByAdmin: prev?.unlockedByAdmin ?? false,
    });
  }

  async get(userId: string): Promise<StoredPrediction | null> {
    return this.byUser.get(userId) ?? null;
  }

  async getStatus(userId: string): Promise<PredictionStatus | null> {
    return this.status.get(userId) ?? null;
  }

  async setUnlock(userId: string, unlocked: boolean): Promise<void> {
    const prev = this.status.get(userId);
    this.status.set(userId, {
      userId,
      submitted: prev?.submitted ?? false,
      submittedAt: prev?.submittedAt ?? null,
      unlockedByAdmin: unlocked,
    });
  }

  async all(): Promise<StoredPrediction[]> {
    return [...this.byUser.values()];
  }
}
