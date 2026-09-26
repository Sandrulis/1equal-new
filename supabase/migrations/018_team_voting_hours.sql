alter table public.teams add column if not exists training_voting_hours integer not null default 24;
alter table public.teams add column if not exists game_voting_hours integer not null default 72;

alter table public.teams drop constraint if exists teams_training_voting_hours;
alter table public.teams drop constraint if exists teams_game_voting_hours;

alter table public.teams
  add constraint teams_training_voting_hours check (training_voting_hours between 1 and 168);

alter table public.teams
  add constraint teams_game_voting_hours check (game_voting_hours between 1 and 168);

notify pgrst, 'reload schema';
