create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  is_admin boolean not null default false,
  avatar_url text,
  color text not null default '#2b5fd0',
  created_at timestamptz not null default now()
);
