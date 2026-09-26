create table if not exists public.admin_team_watches (
  user_id uuid not null references public.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

alter table public.admin_team_watches enable row level security;

revoke all on table public.admin_team_watches from anon, authenticated;

notify pgrst, 'reload schema';
