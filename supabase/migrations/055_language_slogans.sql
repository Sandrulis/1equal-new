alter table public.site_languages
  add column if not exists slogan text not null default '';

alter table public.site_languages drop constraint if exists site_languages_slogan_len;
alter table public.site_languages
  add constraint site_languages_slogan_len
  check (char_length(slogan) <= 200);

update public.site_languages
set slogan = case code
  when 'lv' then 'Komandas vadība vienuviet.'
  when 'en' then 'Team management in one place.'
  when 'ru' then 'Управление командой в одном месте.'
  else slogan
end
where code in ('lv', 'en', 'ru') and slogan = '';

notify pgrst, 'reload schema';
