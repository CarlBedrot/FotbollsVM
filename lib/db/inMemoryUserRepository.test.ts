import { describe, it, expect } from 'vitest';
import { InMemoryUserRepository } from './inMemoryUserRepository';
import type { NewUser } from './userRepository';

function newUser(over: Partial<NewUser> = {}): NewUser {
  return {
    username: 'carl',
    displayName: 'Carl',
    passwordHash: 'hash',
    isAdmin: false,
    color: '#3ee089',
    ...over,
  };
}

describe('InMemoryUserRepository', () => {
  it('creates a user and finds it by username and id', async () => {
    const repo = new InMemoryUserRepository();
    const created = await repo.create(newUser());
    expect(created.username).toBe('carl');
    expect(await repo.findByUsername('carl')).toEqual(created);
    expect(await repo.findById(created.id)).toEqual(created);
  });

  it('throws on duplicate username', async () => {
    const repo = new InMemoryUserRepository();
    await repo.create(newUser());
    await expect(repo.create(newUser())).rejects.toThrow(/already exists/);
  });

  it('update changes fields and returns the record', async () => {
    const repo = new InMemoryUserRepository();
    const created = await repo.create(newUser());
    const updated = await repo.update(created.id, {
      displayName: 'Carl B',
      color: '#ff0000',
      isAdmin: true,
      passwordHash: 'newhash',
    });
    expect(updated.displayName).toBe('Carl B');
    expect(updated.color).toBe('#ff0000');
    expect(updated.isAdmin).toBe(true);
    expect(updated.passwordHash).toBe('newhash');
    expect(updated.username).toBe('carl');
    expect((await repo.findById(created.id))?.displayName).toBe('Carl B');
  });

  it('update throws on unknown id', async () => {
    const repo = new InMemoryUserRepository();
    await expect(repo.update('nope', { displayName: 'x' })).rejects.toThrow(/not found/);
  });

  it('remove deletes the user and list reflects removal', async () => {
    const repo = new InMemoryUserRepository();
    const a = await repo.create(newUser({ username: 'a' }));
    const b = await repo.create(newUser({ username: 'b' }));
    await repo.remove(a.id);
    expect(await repo.findById(a.id)).toBeNull();
    expect((await repo.list()).map((u) => u.username)).toEqual(['b']);
    expect(b.username).toBe('b');
  });
});
