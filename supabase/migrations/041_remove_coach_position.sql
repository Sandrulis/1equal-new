update public.team_members
set position = ''
where upper(btrim(position)) in ('TR', 'TRENERIS', 'COACH', 'TRAINER');

update public.team_members
set extra_positions = btrim(regexp_replace(
  regexp_replace(extra_positions, '(^|,)[[:space:]]*(TR|TRENERIS|COACH|TRAINER)[[:space:]]*(,|$)', ',', 'gi'),
  ',+',
  ',',
  'g'
), ',')
where extra_positions ~* '(^|,)[[:space:]]*(TR|TRENERIS|COACH|TRAINER)[[:space:]]*(,|$)';

notify pgrst, 'reload schema';
