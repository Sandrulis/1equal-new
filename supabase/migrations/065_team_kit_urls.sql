alter table public.teams
  add column if not exists home_kit_url text,
  add column if not exists away_kit_url text;

notify pgrst, 'reload schema';
