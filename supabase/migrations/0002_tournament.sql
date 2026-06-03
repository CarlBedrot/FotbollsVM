create table if not exists public.teams (
  id text primary key,
  name text not null,
  "group" text not null
);

create table if not exists public.matches (
  id text primary key,
  stage text not null,
  "group" text,
  home_team_id text,
  away_team_id text,
  home_label text not null,
  away_label text not null,
  kickoff timestamptz,
  ground text,
  status text not null default 'scheduled',
  home_score int,
  away_score int,
  result_source text,
  updated_by uuid,
  updated_at timestamptz
);

create table if not exists public.settings (
  id int primary key default 1,
  season text not null default '2026',
  lock_at timestamptz,
  constraint settings_singleton check (id = 1)
);
