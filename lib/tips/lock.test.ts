import { describe, it, expect } from 'vitest';
import { isLocked } from './lock';

const LOCK = '2026-06-11T18:00:00.000Z';

describe('isLocked', () => {
  it('is open before the lock time', () => {
    expect(isLocked(LOCK, new Date('2026-06-10T10:00:00Z'), null)).toBe(false);
  });
  it('is locked at/after the lock time', () => {
    expect(isLocked(LOCK, new Date('2026-06-11T18:00:00Z'), null)).toBe(true);
    expect(isLocked(LOCK, new Date('2026-06-12T00:00:00Z'), null)).toBe(true);
  });
  it('an admin-unlocked user is never locked', () => {
    const status = { userId: 'u', submitted: true, submittedAt: null, unlockedByAdmin: true };
    expect(isLocked(LOCK, new Date('2026-06-20T00:00:00Z'), status)).toBe(false);
  });
});
