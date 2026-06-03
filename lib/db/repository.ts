import type { UserRepository } from './userRepository';
import { SupabaseUserRepository } from './supabaseUserRepository';
import { getSupabaseAdmin } from '../supabase';

export function getUserRepository(): UserRepository {
  return new SupabaseUserRepository(getSupabaseAdmin());
}
