create table if not exists public.site_frontend_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  is_enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_frontend_modules_key_unique unique (module_key),
  constraint site_frontend_modules_key_check check (
    module_key ~ '^[a-z0-9._:-]+$'
    and char_length(module_key) between 1 and 128
  )
);

create index if not exists site_frontend_modules_sort_idx on public.site_frontend_modules (sort_order, module_key);

alter table public.site_frontend_modules enable row level security;

revoke all on table public.site_frontend_modules from anon, authenticated;
grant select on table public.site_frontend_modules to authenticated;

drop policy if exists site_frontend_modules_select on public.site_frontend_modules;
create policy site_frontend_modules_select
  on public.site_frontend_modules
  for select
  to authenticated
  using (true);

insert into public.site_frontend_modules (module_key, is_enabled, sort_order)
values
  ('module_subteams', true, 10)
on conflict (module_key) do nothing;

notify pgrst, 'reload schema';
