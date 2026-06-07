import type { NewUser, UserRecord, UserRepository } from './userRepository';

export class InMemoryUserRepository implements UserRepository {
  private users: UserRecord[] = [];
  private seq = 0;

  async findByUsername(username: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.username === username) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(user: NewUser): Promise<UserRecord> {
    if (await this.findByUsername(user.username)) {
      throw new Error(`username already exists: ${user.username}`);
    }
    const rec: UserRecord = {
      id: `u${++this.seq}`,
      username: user.username,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      isAdmin: user.isAdmin,
      avatarUrl: user.avatarUrl ?? null,
      color: user.color,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    this.users.push(rec);
    return rec;
  }

  async list(): Promise<UserRecord[]> {
    return [...this.users];
  }

  async update(
    id: string,
    fields: Partial<Pick<UserRecord, 'displayName' | 'color' | 'isAdmin' | 'avatarUrl' | 'passwordHash'>>,
  ): Promise<UserRecord> {
    const rec = this.users.find((u) => u.id === id);
    if (!rec) {
      throw new Error(`user not found: ${id}`);
    }
    Object.assign(rec, fields);
    return rec;
  }

  async remove(id: string): Promise<void> {
    this.users = this.users.filter((u) => u.id !== id);
  }
}
