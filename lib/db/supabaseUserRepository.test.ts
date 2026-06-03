// lib/db/supabaseUserRepository.test.ts
import { describe, it, expect } from 'vitest';
import { mapRow } from './supabaseUserRepository';

describe('mapRow', () => {
  it('maps a snake_case row to a camelCase UserRecord', () => {
    const row = {
      id: 'abc',
      username: 'carl',
      display_name: 'Carl',
      password_hash: 'hash',
      is_admin: true,
      avatar_url: null,
      color: '#e23b3b',
      created_at: '2026-06-01T10:00:00.000Z',
    };
    expect(mapRow(row)).toEqual({
      id: 'abc',
      username: 'carl',
      displayName: 'Carl',
      passwordHash: 'hash',
      isAdmin: true,
      avatarUrl: null,
      color: '#e23b3b',
      createdAt: '2026-06-01T10:00:00.000Z',
    });
  });
});
