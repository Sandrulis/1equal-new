alter table public.sports drop constraint if exists sports_icon_name;
alter table public.sports
  add constraint sports_icon_name check (
    icon ~ '^(fas:|far:|fab:)?[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(icon) <= 80
  );

notify pgrst, 'reload schema';
