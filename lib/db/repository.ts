import type { UserRepository } from './userRepository';
import { SupabaseUserRepository } from './supabaseUserRepository';
import { getSupabaseAdmin } from '../supabase';
import type { PredictionRepository } from './predictionRepository';
import { SupabasePredictionRepository } from './supabasePredictionRepository';
import { SupabaseMatchRepository } from './supabaseMatchRepository';
import { SupabaseStandingsRepository } from './supabaseStandingsRepository';
import { SupabaseSettingsRepository } from './settingsRepository';
import type { MatchRepository } from './matchRepository';
import type { StandingsRepository } from './standingsRepository';
import type { SettingsRepository } from './settingsRepository';

export function getUserRepository(): UserRepository {
  return new SupabaseUserRepository(getSupabaseAdmin());
}

export function getPredictionRepository(): PredictionRepository {
  return new SupabasePredictionRepository(getSupabaseAdmin());
}

export function getMatchRepository(): MatchRepository {
  return new SupabaseMatchRepository(getSupabaseAdmin());
}

export function getStandingsRepository(): StandingsRepository {
  return new SupabaseStandingsRepository(getSupabaseAdmin());
}

export function getSettingsRepository(): SettingsRepository {
  return new SupabaseSettingsRepository(getSupabaseAdmin());
}
