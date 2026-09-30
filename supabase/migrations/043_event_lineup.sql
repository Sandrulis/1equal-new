alter table public.team_events add column if not exists lineup jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
