alter table public.site_settings
  add column if not exists currency text not null default 'EUR',
  add column if not exists training_voting_hours integer not null default 24,
  add column if not exists game_voting_hours integer not null default 72;

alter table public.site_settings drop constraint if exists site_settings_currency_check;
alter table public.site_settings
  add constraint site_settings_currency_check
  check (currency in ('EUR', 'USD', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF', 'RON', 'BGN', 'TRY', 'CAD', 'AUD', 'JPY'));

alter table public.site_settings drop constraint if exists site_settings_training_voting_hours_check;
alter table public.site_settings
  add constraint site_settings_training_voting_hours_check
  check (training_voting_hours between 1 and 168);

alter table public.site_settings drop constraint if exists site_settings_game_voting_hours_check;
alter table public.site_settings
  add constraint site_settings_game_voting_hours_check
  check (game_voting_hours between 1 and 168);

alter table public.teams
  add column if not exists currency text;

alter table public.teams drop constraint if exists teams_currency_check;
alter table public.teams
  add constraint teams_currency_check
  check (currency is null or currency in ('EUR', 'USD', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF', 'RON', 'BGN', 'TRY', 'CAD', 'AUD', 'JPY'));

notify pgrst, 'reload schema';
