alter table public.users add column if not exists calendar_token text;

create unique index if not exists users_calendar_token_key
  on public.users (calendar_token)
  where calendar_token is not null;

insert into public.site_frontend_modules (module_key, is_enabled, sort_order)
values ('module_calendar', true, 20)
on conflict (module_key) do nothing;

notify pgrst, 'reload schema';
