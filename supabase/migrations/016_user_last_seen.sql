alter table public.users
  add column if not exists last_seen_at timestamptz;

notify pgrst, 'reload schema';
