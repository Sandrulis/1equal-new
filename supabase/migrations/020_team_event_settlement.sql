alter table public.team_events add column if not exists settled_at timestamptz;

create table if not exists public.team_ledger (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  event_id uuid references public.team_events (id) on delete cascade,
  amount numeric(12, 2) not null,
  event_date date not null,
  event_type text not null,
  created_at timestamptz not null default now(),
  constraint team_ledger_amount check (amount <> 0),
  constraint team_ledger_type check (event_type in ('game', 'training'))
);

create unique index if not exists team_ledger_event_idx on public.team_ledger (event_id) where event_id is not null;
create index if not exists team_ledger_team_idx on public.team_ledger (team_id, created_at desc);

alter table public.team_ledger enable row level security;

revoke all on table public.team_ledger from anon, authenticated;
grant select on table public.team_ledger to authenticated;

drop policy if exists team_ledger_select on public.team_ledger;
create policy team_ledger_select
  on public.team_ledger
  for select
  to authenticated
  using (true);

notify pgrst, 'reload schema';
