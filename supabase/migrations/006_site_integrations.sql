create table if not exists public.site_integrations (
  integration_key text primary key,
  client_id text not null default '',
  client_secret text not null default '',
  configured_account_email text not null default '',
  is_configured boolean not null default false,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_integrations_key_check check (
    integration_key in ('turnstile', 'google_oauth', 'resend', 'umami', 'sentry')
  )
);

alter table public.site_integrations enable row level security;

revoke all on table public.site_integrations from anon, authenticated;

drop policy if exists site_integrations_deny_anon on public.site_integrations;
create policy site_integrations_deny_anon
  on public.site_integrations
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists site_integrations_deny_authenticated on public.site_integrations;
create policy site_integrations_deny_authenticated
  on public.site_integrations
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.site_integrations (integration_key)
values ('turnstile'), ('google_oauth'), ('resend'), ('umami'), ('sentry')
on conflict (integration_key) do nothing;
