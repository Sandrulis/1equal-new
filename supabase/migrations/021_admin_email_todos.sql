create table if not exists public.email_templates (
  kind text not null,
  language_code text not null references public.site_languages (code) on delete cascade,
  subject text not null default '',
  body text not null default '',
  button_label text not null default '',
  primary key (kind, language_code),
  constraint email_templates_kind check (kind in ('signup', 'password_reset', 'invite'))
);

create table if not exists public.user_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_todos_title_len check (char_length(btrim(title)) between 1 and 500)
);

create index if not exists user_todos_user_active_idx
  on public.user_todos (user_id, sort_order, created_at)
  where is_done = false;

alter table public.email_templates enable row level security;
alter table public.user_todos enable row level security;

revoke all on table public.email_templates from anon, authenticated;
revoke all on table public.user_todos from anon, authenticated;

insert into public.email_templates (kind, language_code, subject, body, button_label)
values
  ('signup', 'lv', 'Apstiprini e-pastu — {system}', E'Sveiki, {name}!\n\nPaldies, ka reģistrējies sistēmā {system}.\n\nNospied pogu zemāk, lai apstiprinātu e-pastu.', 'Apstiprināt e-pastu'),
  ('signup', 'en', 'Confirm your email — {system}', E'Hello, {name}!\n\nThanks for signing up to {system}.\n\nPress the button below to confirm your email.', 'Confirm email'),
  ('password_reset', 'lv', 'Atjauno paroli — {system}', E'Sveiki, {name}!\n\nSaņēmām pieprasījumu atjaunot paroli sistēmā {system}.\n\nNospied pogu zemāk, lai izvēlētos jaunu paroli.', 'Atjaunot paroli'),
  ('password_reset', 'en', 'Reset your password — {system}', E'Hello, {name}!\n\nWe received a request to reset your password for {system}.\n\nPress the button below to choose a new password.', 'Reset password'),
  ('invite', 'lv', 'Uzaicinājums komandai {team}', E'Sveiki, {name}!\n\n{inviter} uzaicina tevi pievienoties komandai {team} sistēmā {system}.\n\nNospied pogu zemāk, lai pievienotos.', 'Pievienoties komandai'),
  ('invite', 'en', 'Invitation to {team}', E'Hello, {name}!\n\n{inviter} invited you to join {team} in {system}.\n\nPress the button below to join.', 'Join the team')
on conflict (kind, language_code) do nothing;

notify pgrst, 'reload schema';
