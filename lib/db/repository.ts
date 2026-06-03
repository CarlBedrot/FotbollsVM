import type { UserRepository } from './userRepository';
import { SupabaseUserRepository } from './supabaseUserRepository';
import { getSupabaseAdmin } from '../supabase';
import type { PredictionRepository } from './predictionRepository';
import { SupabasePredictionRepository } from './supabasePredictionRepository';

export function getUserRepository(): UserRepository {
  return new SupabaseUserRepository(getSupabaseAdmin());
}

export function getPredictionRepository(): PredictionRepository {
  return new SupabasePredictionRepository(getSupabaseAdmin());
}
