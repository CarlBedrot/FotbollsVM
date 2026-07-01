import { describe, it, expect } from 'vitest';
import { InMemoryTeamStatusRepository } from './inMemoryTeamStatusRepository';

describe('InMemoryTeamStatusRepository', () => {
  it('marks teams eliminated and alive again without duplicates', async () => {
    const repo = new InMemoryTeamStatusRepository();
    expect(await repo.getEliminated()).toEqual([]);

    await repo.setEliminated('BRA', true);
    await repo.setEliminated('BRA', true);
    expect(await repo.getEliminated()).toEqual(['BRA']);

    await repo.setEliminated('ARG', true);
    expect((await repo.getEliminated()).sort()).toEqual(['ARG', 'BRA']);

    await repo.setEliminated('BRA', false);
    expect(await repo.getEliminated()).toEqual(['ARG']);
  });
});
