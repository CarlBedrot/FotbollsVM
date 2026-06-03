create table if not exists public.prediction_matches (
  user_id uuid not null references public.users(id) on delete cascade,
  match_id text not null,
  pick text not null check (pick in ('1','X','2')),
  primary key (user_id, match_id)
);

create table if not exists public.prediction_bonus (
  user_id uuid not null references public.users(id) on delete cascade,
  bonus_key text not null,
  team_id text not null,
  primary key (user_id, bonus_key)
);

create table if not exists public.prediction_status (
  user_id uuid primary key references public.users(id) on delete cascade,
  submitted boolean not null default false,
  submitted_at timestamptz,
  unlocked_by_admin boolean not null default false
);
