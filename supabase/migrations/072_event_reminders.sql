alter table public.users
  add column if not exists event_reminder text not null default '08:00';

alter table public.users drop constraint if exists users_event_reminder_check;
alter table public.users
  add constraint users_event_reminder_check
  check (
    event_reminder = 'off'
    or event_reminder in ('1h', '2h', '3h', '5h')
    or event_reminder ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

create table if not exists public.event_reminders_sent (
  event_id uuid not null references public.team_events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_reminders_sent enable row level security;

revoke all on table public.event_reminders_sent from anon, authenticated;

drop policy if exists event_reminders_sent_deny_anon on public.event_reminders_sent;
create policy event_reminders_sent_deny_anon
  on public.event_reminders_sent
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists event_reminders_sent_deny_authenticated on public.event_reminders_sent;
create policy event_reminders_sent_deny_authenticated
  on public.event_reminders_sent
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.cron_jobs (job_key, enabled, token)
values ('reminders', true, md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text))
on conflict (job_key) do nothing;

notify pgrst, 'reload schema';
