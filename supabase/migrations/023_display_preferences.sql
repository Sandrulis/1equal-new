alter table public.site_settings
  add column if not exists week_start_day text not null default 'monday',
  add column if not exists date_format text not null default 'd.m.Y',
  add column if not exists date_separator text not null default '.',
  add column if not exists time_format text not null default '24',
  add column if not exists timezone text not null default 'Europe/Riga';

alter table public.site_settings drop constraint if exists site_settings_week_start_day_check;
alter table public.site_settings
  add constraint site_settings_week_start_day_check
  check (week_start_day in ('monday', 'sunday'));

alter table public.site_settings drop constraint if exists site_settings_date_format_check;
alter table public.site_settings
  add constraint site_settings_date_format_check
  check (date_format in ('Y-m-d', 'd-m-Y', 'd/m/Y', 'm/d/Y', 'd.m.Y'));

alter table public.site_settings drop constraint if exists site_settings_date_separator_check;
alter table public.site_settings
  add constraint site_settings_date_separator_check
  check (date_separator in ('.', '-', '/', ' '));

alter table public.site_settings drop constraint if exists site_settings_time_format_check;
alter table public.site_settings
  add constraint site_settings_time_format_check
  check (time_format in ('12', '24'));

alter table public.users
  add column if not exists week_start_day text,
  add column if not exists date_format text,
  add column if not exists date_separator text,
  add column if not exists time_format text,
  add column if not exists timezone text;

alter table public.users drop constraint if exists users_week_start_day_check;
alter table public.users
  add constraint users_week_start_day_check
  check (week_start_day is null or week_start_day in ('monday', 'sunday'));

alter table public.users drop constraint if exists users_date_format_check;
alter table public.users
  add constraint users_date_format_check
  check (date_format is null or date_format in ('Y-m-d', 'd-m-Y', 'd/m/Y', 'm/d/Y', 'd.m.Y'));

alter table public.users drop constraint if exists users_date_separator_check;
alter table public.users
  add constraint users_date_separator_check
  check (date_separator is null or date_separator in ('.', '-', '/', ' '));

alter table public.users drop constraint if exists users_time_format_check;
alter table public.users
  add constraint users_time_format_check
  check (time_format is null or time_format in ('12', '24'));

notify pgrst, 'reload schema';
