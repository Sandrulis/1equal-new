insert into public.site_frontend_modules (module_key, is_enabled, is_individual, sort_order)
values ('module_pond', false, false, 50)
on conflict (module_key) do nothing;

alter table public.team_events
  add column if not exists allow_guests boolean not null default false;

alter table public.team_event_rsvps
  add column if not exists is_guest boolean not null default false;

notify pgrst, 'reload schema';
