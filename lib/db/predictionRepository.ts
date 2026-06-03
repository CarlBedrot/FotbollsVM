import type { BonusKey, Pick } from '../domain/types';

export interface StoredPrediction {
  userId: string;
  matchPicks: Record<string, Pick>;
  bonus: Partial<Record<BonusKey, string>>;
}

export interface PredictionStatus {
  userId: string;
  submitted: boolean;
  submittedAt: string | null;
  unlockedByAdmin: boolean;
}

export interface PredictionRepository {
  save(prediction: StoredPrediction, submittedAt: string): Promise<void>;
  get(userId: string): Promise<StoredPrediction | null>;
  getStatus(userId: string): Promise<PredictionStatus | null>;
  setUnlock(userId: string, unlocked: boolean): Promise<void>;
  all(): Promise<StoredPrediction[]>;
}
