alter table public.team_members add column if not exists fee_exempt boolean not null default false;

create table if not exists public.team_member_subteams (
  team_id uuid not null,
  user_id uuid not null,
  subteam_id uuid not null references public.subteams (id) on delete cascade,
  primary key (team_id, user_id, subteam_id),
  foreign key (team_id, user_id) references public.team_members (team_id, user_id) on delete cascade
);

create index if not exists team_member_subteams_subteam_id_idx on public.team_member_subteams (subteam_id);

alter table public.team_member_subteams enable row level security;

revoke all on table public.team_member_subteams from anon, authenticated;
grant select on table public.team_member_subteams to authenticated;

drop policy if exists team_member_subteams_select on public.team_member_subteams;
create policy team_member_subteams_select
  on public.team_member_subteams
  for select
  to authenticated
  using (true);
