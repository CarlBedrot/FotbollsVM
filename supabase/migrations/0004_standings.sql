create table if not exists public.standings (
  user_id uuid primary key references public.users(id) on delete cascade,
  rank int not null,
  prev_rank int,
  total_points int not null,
  match_points int not null,
  bonus_points int not null,
  breakdown jsonb not null,
  computed_at timestamptz not null default now()
);
