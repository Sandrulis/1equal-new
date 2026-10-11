create table if not exists public.push_devices (
  token text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists push_devices_user_id_idx
  on public.push_devices (user_id);

alter table public.push_devices enable row level security;

revoke all on table public.push_devices from anon, authenticated;

drop policy if exists push_devices_deny_anon on public.push_devices;
create policy push_devices_deny_anon
  on public.push_devices
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists push_devices_deny_authenticated on public.push_devices;
create policy push_devices_deny_authenticated
  on public.push_devices
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
