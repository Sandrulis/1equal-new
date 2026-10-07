create table if not exists public.team_player_invites (
  team_id uuid not null references public.teams (id) on delete cascade,
  email text not null,
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz not null default now(),
  primary key (team_id, email),
  constraint team_player_invites_email_len check (char_length(email) between 3 and 200)
);

create index if not exists team_player_invites_sent_idx
  on public.team_player_invites (team_id, sent_at desc);

alter table public.team_player_invites enable row level security;

revoke all on table public.team_player_invites from anon, authenticated;

drop policy if exists team_player_invites_deny_anon on public.team_player_invites;
create policy team_player_invites_deny_anon on public.team_player_invites for all to anon using (false) with check (false);

drop policy if exists team_player_invites_deny_authenticated on public.team_player_invites;
create policy team_player_invites_deny_authenticated on public.team_player_invites for all to authenticated using (false) with check (false);

notify pgrst, 'reload schema';
