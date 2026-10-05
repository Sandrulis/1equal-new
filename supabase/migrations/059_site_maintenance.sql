alter table public.site_settings
  add column if not exists maintenance boolean not null default false;

notify pgrst, 'reload schema';
