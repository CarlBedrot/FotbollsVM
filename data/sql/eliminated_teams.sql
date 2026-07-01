-- Knockout teams admin has marked as eliminated. Presence of a row = eliminated.
-- Run once against the Supabase project (SQL editor).
create table if not exists public.eliminated_teams (
  team_id text primary key,
  eliminated_at timestamptz not null default now()
);
