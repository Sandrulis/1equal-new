alter table public.users
  add column if not exists language_code text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_language_code_len') then
    alter table public.users
      add constraint users_language_code_len
      check (language_code = '' or char_length(language_code) <= 12);
  end if;
end $$;

notify pgrst, 'reload schema';
