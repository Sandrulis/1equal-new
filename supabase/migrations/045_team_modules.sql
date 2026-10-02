alter table public.site_frontend_modules
  add column if not exists is_individual boolean not null default false;

create table if not exists public.team_modules (
  team_id uuid not null references public.teams (id) on delete cascade,
  module_key text not null references public.site_frontend_modules (module_key) on delete cascade,
  primary key (team_id, module_key)
);

create index if not exists team_modules_module_idx on public.team_modules (module_key);

alter table public.team_modules enable row level security;

revoke all on table public.team_modules from anon, authenticated;

drop policy if exists team_modules_deny_anon on public.team_modules;
create policy team_modules_deny_anon on public.team_modules for all to anon using (false) with check (false);

drop policy if exists team_modules_deny_authenticated on public.team_modules;
create policy team_modules_deny_authenticated on public.team_modules for all to authenticated using (false) with check (false);

notify pgrst, 'reload schema';
