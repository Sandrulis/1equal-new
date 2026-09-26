alter table public.teams add column if not exists leader_id uuid references public.users (id);

update public.teams as team
set leader_id = picked.user_id
from (
  select distinct on (team_id) team_id, user_id
  from public.team_members
  order by team_id, joined_on asc, updated_at asc
) as picked
where team.id = picked.team_id
  and team.leader_id is null;

create table if not exists public.balance_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  kind text not null default 'manual',
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  constraint balance_entries_kind check (kind = 'manual'),
  constraint balance_entries_amount_nonzero check (amount <> 0)
);

create index if not exists balance_entries_member_idx
  on public.balance_entries (team_id, user_id, created_at desc);

alter table public.balance_entries enable row level security;

revoke all on table public.balance_entries from anon, authenticated;
grant select on table public.balance_entries to authenticated;

drop policy if exists balance_entries_select on public.balance_entries;
create policy balance_entries_select
  on public.balance_entries
  for select
  to authenticated
  using (true);
