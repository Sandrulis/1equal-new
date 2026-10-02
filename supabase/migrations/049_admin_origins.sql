create table if not exists public.user_origins (
  user_id uuid primary key references public.users (id) on delete cascade,
  ip text not null default '',
  country_code text not null default '',
  updated_at timestamptz not null default now(),
  constraint user_origins_ip_len check (char_length(ip) <= 64),
  constraint user_origins_country check (country_code = '' or country_code ~ '^[A-Z]{2}$')
);

create table if not exists public.team_origins (
  team_id uuid primary key references public.teams (id) on delete cascade,
  ip text not null default '',
  country_code text not null default '',
  updated_at timestamptz not null default now(),
  constraint team_origins_ip_len check (char_length(ip) <= 64),
  constraint team_origins_country check (country_code = '' or country_code ~ '^[A-Z]{2}$')
);

alter table public.user_origins enable row level security;
alter table public.team_origins enable row level security;

revoke all on table public.user_origins from anon, authenticated;
revoke all on table public.team_origins from anon, authenticated;

drop policy if exists user_origins_deny_anon on public.user_origins;
create policy user_origins_deny_anon on public.user_origins for all to anon using (false) with check (false);
drop policy if exists user_origins_deny_authenticated on public.user_origins;
create policy user_origins_deny_authenticated on public.user_origins for all to authenticated using (false) with check (false);

drop policy if exists team_origins_deny_anon on public.team_origins;
create policy team_origins_deny_anon on public.team_origins for all to anon using (false) with check (false);
drop policy if exists team_origins_deny_authenticated on public.team_origins;
create policy team_origins_deny_authenticated on public.team_origins for all to authenticated using (false) with check (false);

notify pgrst, 'reload schema';
