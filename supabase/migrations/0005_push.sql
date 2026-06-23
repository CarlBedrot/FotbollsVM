-- Daily morning push: per-device subscriptions + last-digest snapshot.

-- One row per browser/device push channel. `endpoint` is the natural key the
-- Web Push API hands us; cascade so deleting a user drops their devices.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Snapshot of the standings at the last push, so overnight movement is measured
-- push-to-push rather than recompute-to-recompute. Lives on the singleton row.
alter table public.settings
  add column if not exists last_digest jsonb;
