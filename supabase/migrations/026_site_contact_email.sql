alter table public.site_settings
  add column if not exists contact_email text not null default '';

alter table public.site_settings drop constraint if exists site_settings_contact_email_len;
alter table public.site_settings
  add constraint site_settings_contact_email_len
  check (char_length(contact_email) <= 200);

notify pgrst, 'reload schema';
