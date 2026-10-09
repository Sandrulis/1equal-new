create table if not exists public.ehl_team_marks (
  team_id text primary key,
  mark text not null,
  updated_at timestamptz not null default now(),
  constraint ehl_team_marks_id check (team_id ~ '^[0-9]{1,12}$'),
  constraint ehl_team_marks_mark check (mark in ('info', 'no', 'yes'))
);

alter table public.ehl_team_marks enable row level security;

revoke all on table public.ehl_team_marks from anon, authenticated;

drop policy if exists ehl_team_marks_deny_anon on public.ehl_team_marks;
create policy ehl_team_marks_deny_anon
  on public.ehl_team_marks
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists ehl_team_marks_deny_authenticated on public.ehl_team_marks;
create policy ehl_team_marks_deny_authenticated
  on public.ehl_team_marks
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
