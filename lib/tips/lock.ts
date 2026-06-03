import type { PredictionStatus } from '../db/predictionRepository';

/**
 * Predictions lock at the first kickoff. An admin can unlock a single user
 * (e.g. they uploaded the wrong file just before kickoff).
 */
export function isLocked(lockAt: string, now: Date, status: PredictionStatus | null): boolean {
  if (status?.unlockedByAdmin) return false;
  return now.getTime() >= new Date(lockAt).getTime();
}
