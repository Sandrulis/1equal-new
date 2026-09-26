alter table public.teams add column if not exists invite_code text;
alter table public.teams add column if not exists source_url text;
alter table public.teams add column if not exists logo_url text;

create unique index if not exists teams_invite_code_key
  on public.teams (invite_code)
  where invite_code is not null;

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  jersey_number integer,
  position text not null default '',
  phone text not null default '',
  ehl_player jsonb,
  joined_on date not null default current_date,
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint team_members_number_range check (jersey_number is null or jersey_number between 1 and 99),
  constraint team_members_position_len check (char_length(position) <= 40),
  constraint team_members_phone_len check (char_length(phone) <= 40)
);

create index if not exists team_members_user_id_idx on public.team_members (user_id);

alter table public.team_members enable row level security;

revoke all on table public.team_members from anon, authenticated;
grant select on table public.team_members to authenticated;

drop policy if exists team_members_select on public.team_members;
create policy team_members_select
  on public.team_members
  for select
  to authenticated
  using (true);
