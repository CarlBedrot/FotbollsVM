// lib/auth/loginService.test.ts
import { describe, it, expect } from 'vitest';
import { InMemoryUserRepository } from '../db/inMemoryUserRepository';
import { hashPassword } from './password';
import { authenticate } from './loginService';

async function repoWithCarl() {
  const repo = new InMemoryUserRepository();
  await repo.create({
    username: 'carl',
    displayName: 'Carl',
    passwordHash: await hashPassword('hunter2'),
    isAdmin: true,
    color: '#e23b3b',
  });
  return repo;
}

describe('authenticate', () => {
  it('returns a session payload for correct credentials', async () => {
    const repo = await repoWithCarl();
    const session = await authenticate(repo, 'carl', 'hunter2');
    expect(session).toEqual({ userId: expect.any(String), username: 'carl', isAdmin: true });
  });
  it('returns null for a wrong password', async () => {
    const repo = await repoWithCarl();
    expect(await authenticate(repo, 'carl', 'nope')).toBeNull();
  });
  it('returns null for an unknown username', async () => {
    const repo = await repoWithCarl();
    expect(await authenticate(repo, 'ghost', 'hunter2')).toBeNull();
  });
});

describe('InMemoryUserRepository', () => {
  it('rejects duplicate usernames', async () => {
    const repo = new InMemoryUserRepository();
    await repo.create({ username: 'carl', displayName: 'Carl', passwordHash: 'x', isAdmin: false, color: '#000' });
    await expect(
      repo.create({ username: 'carl', displayName: 'Carl2', passwordHash: 'y', isAdmin: false, color: '#111' }),
    ).rejects.toThrow();
  });
});
