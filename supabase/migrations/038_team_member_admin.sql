alter table public.team_members
  add column if not exists is_team_admin boolean not null default false;

notify pgrst, 'reload schema';
