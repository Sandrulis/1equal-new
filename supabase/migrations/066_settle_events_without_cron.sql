drop function if exists public.settle_finished_events(uuid[]);
drop function if exists public.settle_finished_events(uuid[], boolean);

create or replace function public.settle_finished_events(team_ids uuid[], only_started boolean default true)
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
      and (
        not only_started
        or ((e.event_date::text || ' ' || e.start_time)::timestamp at time zone 'Europe/Riga') <= now()
      )
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

revoke all on function public.settle_finished_events(uuid[], boolean) from public, anon, authenticated;
grant execute on function public.settle_finished_events(uuid[], boolean) to service_role;

create or replace function public.settle_finance_reservations(only_started boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  charged_count integer := 0;
begin
  with due as (
    select
      r.team_id,
      r.user_id,
      r.event_id,
      round(r.amount::numeric, 2) as amount
    from public.finance_reservations r
    join public.team_events e on e.id = r.event_id
    join public.team_event_rsvps v
      on v.event_id = r.event_id
      and v.user_id = r.user_id
      and v.status = 'going'
    where r.amount > 0
      and (
        not only_started
        or ((e.event_date::text || ' ' || e.start_time)::timestamp at time zone 'Europe/Riga') <= now()
      )
  ),
  charged as (
    insert into public.balance_entries (team_id, user_id, amount, kind, event_id, created_by)
    select team_id, user_id, -amount, 'event', event_id, user_id
    from due
    on conflict (event_id, user_id) where event_id is not null and kind = 'event' do nothing
    returning team_id, amount
  ),
  bumped as (
    update public.teams t
    set balance = round((t.balance - sums.delta)::numeric, 2)
    from (
      select team_id, sum(amount) as delta
      from charged
      group by team_id
    ) sums
    where t.id = sums.team_id
    returning t.id
  )
  select count(*) into charged_count from charged;

  delete from public.finance_reservations r
  using public.team_events e
  where r.event_id = e.id
    and (
      not only_started
      or ((e.event_date::text || ' ' || e.start_time)::timestamp at time zone 'Europe/Riga') <= now()
    );

  if only_started then
    perform public.settle_finished_events(coalesce((
      select array_agg(distinct e.team_id)
      from public.team_events e
      where e.settled_at is null
        and coalesce(e.expense, 0) > 0
        and ((e.event_date::text || ' ' || e.start_time)::timestamp at time zone 'Europe/Riga') <= now()
    ), '{}'::uuid[]));
  else
    perform public.settle_finished_events(coalesce((
      select array_agg(distinct e.team_id)
      from public.team_events e
      where e.settled_at is null
        and coalesce(e.expense, 0) > 0
    ), '{}'::uuid[]), false);
  end if;

  return charged_count;
end;
$$;

revoke all on function public.settle_finance_reservations(boolean) from public, anon, authenticated;
grant execute on function public.settle_finance_reservations(boolean) to service_role;

notify pgrst, 'reload schema';
