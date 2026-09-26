create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  price_per_hour numeric(10, 2) not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint venues_price_range check (price_per_hour >= 0 and price_per_hour <= 1000000)
);

create index if not exists venues_team_id_idx on public.venues (team_id);

alter table public.venues enable row level security;

revoke all on table public.venues from anon, authenticated;
grant select on table public.venues to authenticated;

drop policy if exists venues_select on public.venues;
create policy venues_select
  on public.venues
  for select
  to authenticated
  using (true);

notify pgrst, 'reload schema';
