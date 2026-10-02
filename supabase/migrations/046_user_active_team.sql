alter table public.users
  add column if not exists active_team_id uuid references public.teams (id) on delete set null;

create index if not exists users_active_team_idx on public.users (active_team_id);

notify pgrst, 'reload schema';
