create extension if not exists pgcrypto;

create or replace function public.is_team_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = target
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_team_member(uuid) from public, anon, authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.is_team_member(id));

drop policy if exists subteams_select on public.subteams;
create policy subteams_select on public.subteams for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_member_subteams_select on public.team_member_subteams;
create policy team_member_subteams_select on public.team_member_subteams for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists venues_select on public.venues;
create policy venues_select on public.venues for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_events_select on public.team_events;
create policy team_events_select on public.team_events for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_event_rsvps_select on public.team_event_rsvps;
create policy team_event_rsvps_select on public.team_event_rsvps for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists balance_entries_select on public.balance_entries;
create policy balance_entries_select on public.balance_entries for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_ledger_select on public.team_ledger;
create policy team_ledger_select on public.team_ledger for select to authenticated
  using (public.is_team_member(team_id));

create or replace function public.settle_finished_events(team_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with due as (
    select
      e.id,
      e.team_id,
      e.event_date,
      e.event_type,
      round(e.expense::numeric, 2) as expense
    from public.team_events e
    where e.team_id = any(team_ids)
      and e.settled_at is null
      and coalesce(e.expense, 0) > 0
      and ((e.event_date::text || ' ' || e.start_time)::timestamp at time zone 'Europe/Riga') <= now()
  ),
  claimed as (
    update public.team_events e
    set settled_at = now()
    from due
    where e.id = due.id
      and e.settled_at is null
    returning due.team_id, e.id as event_id, due.event_date, due.event_type, due.expense
  ),
  booked as (
    insert into public.team_ledger (team_id, event_id, amount, event_date, event_type)
    select
      team_id,
      event_id,
      -expense,
      event_date,
      case when event_type = 'game' then 'game' else 'training' end
    from claimed
    returning team_id, amount
  )
  update public.teams t
  set balance = round((t.balance + sums.delta)::numeric, 2)
  from (
    select team_id, sum(amount) as delta
    from booked
    group by team_id
  ) sums
  where t.id = sums.team_id;
end;
$$;

revoke all on function public.settle_finished_events(uuid[]) from public, anon, authenticated;
grant execute on function public.settle_finished_events(uuid[]) to service_role;

create or replace function public.adjust_team_balance(target uuid, delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric;
begin
  update public.teams
  set balance = round((balance + delta)::numeric, 2)
  where id = target
  returning balance into next_balance;
  return next_balance;
end;
$$;

revoke all on function public.adjust_team_balance(uuid, numeric) from public, anon, authenticated;
grant execute on function public.adjust_team_balance(uuid, numeric) to service_role;

alter table public.users add column if not exists calendar_token_hash text;

update public.users
set calendar_token_hash = encode(digest(calendar_token, 'sha256'), 'hex')
where calendar_token is not null
  and calendar_token_hash is null;

update public.users
set calendar_token = null
where calendar_token is not null;

create unique index if not exists users_calendar_token_hash_key
  on public.users (calendar_token_hash)
  where calendar_token_hash is not null;

alter table public.event_vote_links add column if not exists expires_at timestamptz;

update public.event_vote_links
set expires_at = created_at + interval '14 days'
where expires_at is null;

alter table public.event_vote_links alter column expires_at set default (now() + interval '14 days');

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
where id = 'branding';

notify pgrst, 'reload schema';
