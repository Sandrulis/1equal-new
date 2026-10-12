alter table public.users drop constraint if exists users_event_reminder_check;
alter table public.users
  add constraint users_event_reminder_check
  check (
    event_reminder = 'off'
    or event_reminder ~ '^([1-9]|1[0-2])h$'
    or event_reminder ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

notify pgrst, 'reload schema';
