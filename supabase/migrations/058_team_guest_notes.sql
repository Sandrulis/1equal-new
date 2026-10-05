create table if not exists public.team_guest_notes (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint team_guest_notes_note_len check (char_length(note) <= 500)
);

alter table public.team_guest_notes enable row level security;

revoke all on table public.team_guest_notes from anon, authenticated;

drop policy if exists team_guest_notes_deny_anon on public.team_guest_notes;
create policy team_guest_notes_deny_anon on public.team_guest_notes for all to anon using (false) with check (false);

drop policy if exists team_guest_notes_deny_authenticated on public.team_guest_notes;
create policy team_guest_notes_deny_authenticated on public.team_guest_notes for all to authenticated using (false) with check (false);

notify pgrst, 'reload schema';
