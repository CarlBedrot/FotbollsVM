import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewUser, UserRecord, UserRepository } from './userRepository';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  is_admin: boolean;
  avatar_url: string | null;
  color: string;
  created_at: string;
}

export function mapRow(r: UserRow): UserRecord {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    passwordHash: r.password_hash,
    isAdmin: r.is_admin,
    avatarUrl: r.avatar_url,
    color: r.color,
    createdAt: r.created_at,
  };
}

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByUsername(username: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from('users').select('*').eq('username', username).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as UserRow) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as UserRow) : null;
  }

  async create(user: NewUser): Promise<UserRecord> {
    const { data, error } = await this.db
      .from('users')
      .insert({
        username: user.username,
        display_name: user.displayName,
        password_hash: user.passwordHash,
        is_admin: user.isAdmin,
        avatar_url: user.avatarUrl ?? null,
        color: user.color,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as UserRow);
  }

  async list(): Promise<UserRecord[]> {
    const { data, error } = await this.db.from('users').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return (data as UserRow[]).map(mapRow);
  }

  async update(
    id: string,
    fields: Partial<Pick<UserRecord, 'displayName' | 'color' | 'isAdmin' | 'avatarUrl' | 'passwordHash'>>,
  ): Promise<UserRecord> {
    const patch: Partial<UserRow> = {};
    if (fields.displayName !== undefined) patch.display_name = fields.displayName;
    if (fields.color !== undefined) patch.color = fields.color;
    if (fields.isAdmin !== undefined) patch.is_admin = fields.isAdmin;
    if (fields.avatarUrl !== undefined) patch.avatar_url = fields.avatarUrl;
    if (fields.passwordHash !== undefined) patch.password_hash = fields.passwordHash;
    const { data, error } = await this.db.from('users').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return mapRow(data as UserRow);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
