alter table public.team_members drop constraint if exists team_members_number_range;

alter table public.team_members
  add constraint team_members_number_range
  check (jersey_number is null or jersey_number between 0 and 99);
