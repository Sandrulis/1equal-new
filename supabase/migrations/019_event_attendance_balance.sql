alter table public.teams add column if not exists balance numeric(12, 2) not null default 0;

alter table public.balance_entries add column if not exists event_id uuid references public.team_events (id) on delete cascade;

alter table public.balance_entries drop constraint if exists balance_entries_kind;
alter table public.balance_entries
  add constraint balance_entries_kind check (kind in ('manual', 'event'));

create unique index if not exists balance_entries_event_user_idx
  on public.balance_entries (event_id, user_id)
  where event_id is not null and kind = 'event';

create table if not exists public.team_event_rsvps (
  event_id uuid not null references public.team_events (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id),
  constraint team_event_rsvps_status check (status in ('going', 'absent'))
);

create index if not exists team_event_rsvps_team_idx on public.team_event_rsvps (team_id);

alter table public.team_event_rsvps enable row level security;
revoke all on table public.team_event_rsvps from anon, authenticated;
grant select on table public.team_event_rsvps to authenticated;

drop policy if exists team_event_rsvps_select on public.team_event_rsvps;
create policy team_event_rsvps_select
  on public.team_event_rsvps
  for select
  to authenticated
  using (true);

notify pgrst, 'reload schema';
