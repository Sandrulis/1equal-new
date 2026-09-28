alter table public.users
  add column if not exists event_emails boolean not null default true;

notify pgrst, 'reload schema';
