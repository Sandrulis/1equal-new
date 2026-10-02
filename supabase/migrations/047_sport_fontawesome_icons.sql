alter table public.sports drop constraint if exists sports_icon;

update public.sports
set icon = case icon
  when 'hockey' then 'hockey-puck'
  when 'ball' then 'futbol'
  when 'basket' then 'basketball'
  when 'racket' then 'table-tennis-paddle-ball'
  when 'swim' then 'person-swimming'
  when 'run' then 'person-running'
  else icon
end
where icon in ('hockey', 'ball', 'basket', 'racket', 'swim', 'run');

alter table public.sports drop constraint if exists sports_icon_name;
alter table public.sports
  add constraint sports_icon_name check (icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(icon) <= 80);

alter table public.sports alter column icon set default 'hockey-puck';

notify pgrst, 'reload schema';
