create table if not exists public.cron_jobs (
  job_key text primary key,
  enabled boolean not null default false,
  token text not null,
  updated_at timestamptz not null default now(),
  constraint cron_jobs_token_len check (char_length(token) >= 32)
);

insert into public.cron_jobs (job_key, enabled, token)
values ('finance', false, md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text))
on conflict (job_key) do nothing;

alter table public.cron_jobs enable row level security;
revoke all on table public.cron_jobs from anon, authenticated;

create table if not exists public.finance_reservations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  event_id uuid not null references public.team_events (id) on delete cascade,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint finance_reservations_amount_positive check (amount > 0),
  constraint finance_reservations_event_user unique (event_id, user_id)
);

create index if not exists finance_reservations_team_idx on public.finance_reservations (team_id);

alter table public.finance_reservations enable row level security;
revoke all on table public.finance_reservations from anon, authenticated;

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
  end if;

  return charged_count;
end;
$$;

revoke all on function public.settle_finance_reservations(boolean) from public, anon, authenticated;
grant execute on function public.settle_finance_reservations(boolean) to service_role;

notify pgrst, 'reload schema';
