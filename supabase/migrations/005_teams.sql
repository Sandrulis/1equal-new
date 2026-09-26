create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_len check (char_length(btrim(name)) between 1 and 80)
);

create table if not exists public.subteams (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  color text not null default '#0f6e82',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subteams_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint subteams_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists subteams_team_id_idx on public.subteams (team_id);

alter table public.teams enable row level security;
alter table public.subteams enable row level security;

revoke all on table public.teams from anon, authenticated;
revoke all on table public.subteams from anon, authenticated;

grant select on table public.teams to authenticated;
grant select on table public.subteams to authenticated;

drop policy if exists teams_select on public.teams;
create policy teams_select
  on public.teams
  for select
  to authenticated
  using (true);

drop policy if exists subteams_select on public.subteams;
create policy subteams_select
  on public.subteams
  for select
  to authenticated
  using (true);
