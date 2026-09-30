alter table public.team_events drop constraint if exists team_events_shape;

alter table public.team_events add constraint team_events_shape check (
  (event_type = 'game' and expense is not null and with_coach = false)
  or (event_type = 'training')
);
