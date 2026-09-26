create table if not exists public.team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  event_date date not null,
  start_time text not null,
  event_type text not null,
  venue_id uuid not null references public.venues (id) on delete cascade,
  subteam_id uuid references public.subteams (id) on delete set null,
  expense numeric(12, 2),
  with_coach boolean not null default false,
  created_at timestamptz not null default now(),
  constraint team_events_type check (event_type in ('game', 'training')),
  constraint team_events_start check (start_time ~ '^\d{2}:\d{2}$'),
  constraint team_events_expense check (expense is null or (expense >= 0 and expense <= 1000000)),
  constraint team_events_shape check (
    (event_type = 'game' and expense is not null and with_coach = false)
    or (event_type = 'training' and expense is null)
  )
);

create index if not exists team_events_team_date_idx on public.team_events (team_id, event_date, start_time);

alter table public.team_events enable row level security;

revoke all on table public.team_events from anon, authenticated;
grant select on table public.team_events to authenticated;

drop policy if exists team_events_select on public.team_events;
create policy team_events_select
  on public.team_events
  for select
  to authenticated
  using (true);

notify pgrst, 'reload schema';
