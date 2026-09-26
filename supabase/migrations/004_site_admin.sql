create table if not exists public.site_settings (
  id integer primary key,
  name text not null,
  logo_path text,
  favicon_path text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id, name)
values (1, '1equal')
on conflict (id) do nothing;

create table if not exists public.site_languages (
  code text primary key,
  name text not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0
);

create unique index if not exists site_languages_one_default
  on public.site_languages ((is_default))
  where is_default;

insert into public.site_languages (code, name, is_active, is_default, sort_order)
values
  ('lv', 'Latviešu', true, true, 0),
  ('en', 'English', true, false, 1)
on conflict (code) do nothing;

create table if not exists public.site_translations (
  translation_key text not null,
  language_code text not null references public.site_languages (code) on delete cascade,
  value text not null default '',
  primary key (translation_key, language_code)
);

alter table public.site_settings enable row level security;
alter table public.site_languages enable row level security;
alter table public.site_translations enable row level security;

revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.site_languages from anon, authenticated;
revoke all on table public.site_translations from anon, authenticated;

grant select on table public.site_settings to anon, authenticated;
grant select on table public.site_languages to anon, authenticated;
grant select on table public.site_translations to anon, authenticated;

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_languages_select on public.site_languages;
create policy site_languages_select
  on public.site_languages
  for select
  to anon, authenticated
  using (true);

drop policy if exists site_translations_select on public.site_translations;
create policy site_translations_select
  on public.site_translations
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  1572864,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'branding');
