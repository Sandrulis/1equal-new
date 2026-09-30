alter table public.team_members
  add column if not exists extra_positions text not null default '';

alter table public.team_members drop constraint if exists team_members_extra_positions_len;
alter table public.team_members
  add constraint team_members_extra_positions_len check (char_length(extra_positions) <= 40);

notify pgrst, 'reload schema';
