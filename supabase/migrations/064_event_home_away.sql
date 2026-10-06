alter table public.team_events
  add column if not exists is_home boolean;

notify pgrst, 'reload schema';
