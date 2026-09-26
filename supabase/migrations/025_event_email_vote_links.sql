alter table public.email_templates drop constraint if exists email_templates_kind;
alter table public.email_templates
  add constraint email_templates_kind check (kind in ('signup', 'password_reset', 'invite', 'event'));

insert into public.email_templates (kind, language_code, subject, body, button_label)
values
  (
    'event',
    'lv',
    'Jauns notikums: {team}',
    E'Sveiki, {name}!\n\nKomandai {team} ir jauns notikums.\n\n{type}\n{date} {time}\n{venue}\nCena: {price}\n\nVari nobalsot sistēmā vai uzreiz no šī e-pasta beigām.',
    'Nobalsot sistēmā'
  ),
  (
    'event',
    'en',
    'New event: {team}',
    E'Hello, {name}!\n\n{team} has a new event.\n\n{type}\n{date} {time}\n{venue}\nPrice: {price}\n\nYou can vote in the app, or right from the end of this email.',
    'Vote in the app'
  )
on conflict (kind, language_code) do nothing;

create table if not exists public.event_vote_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  team_id uuid not null references public.teams (id) on delete cascade,
  event_id uuid not null references public.team_events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint event_vote_links_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint event_vote_links_token_key unique (token_hash),
  constraint event_vote_links_event_user_key unique (event_id, user_id)
);

alter table public.event_vote_links enable row level security;

revoke all on table public.event_vote_links from anon, authenticated;

drop policy if exists event_vote_links_deny_anon on public.event_vote_links;
create policy event_vote_links_deny_anon
  on public.event_vote_links
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists event_vote_links_deny_authenticated on public.event_vote_links;
create policy event_vote_links_deny_authenticated
  on public.event_vote_links
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
