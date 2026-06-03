import { describe, it, expect } from 'vitest';
import { InMemoryPredictionRepository } from './inMemoryPredictionRepository';

describe('InMemoryPredictionRepository', () => {
  it('saves and reads a prediction + marks status submitted', async () => {
    const repo = new InMemoryPredictionRepository();
    await repo.save({ userId: 'u1', matchPicks: { G001: '1' }, bonus: { champion: 'a0' } }, '2026-06-01T00:00:00Z');
    expect(await repo.get('u1')).toEqual({ userId: 'u1', matchPicks: { G001: '1' }, bonus: { champion: 'a0' } });
    const st = await repo.getStatus('u1');
    expect(st?.submitted).toBe(true);
    expect(st?.submittedAt).toBe('2026-06-01T00:00:00Z');
  });
  it('preserves an admin unlock across a later save', async () => {
    const repo = new InMemoryPredictionRepository();
    await repo.setUnlock('u1', true);
    await repo.save({ userId: 'u1', matchPicks: {}, bonus: {} }, '2026-06-01T00:00:00Z');
    expect((await repo.getStatus('u1'))?.unlockedByAdmin).toBe(true);
  });
  it('lists all predictions', async () => {
    const repo = new InMemoryPredictionRepository();
    await repo.save({ userId: 'a', matchPicks: {}, bonus: {} }, 't');
    await repo.save({ userId: 'b', matchPicks: {}, bonus: {} }, 't');
    expect((await repo.all()).map((p) => p.userId).sort()).toEqual(['a', 'b']);
  });
});
