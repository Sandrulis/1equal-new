create table if not exists public.email_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  new_email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint email_change_requests_email_len check (char_length(new_email) between 3 and 200),
  constraint email_change_requests_token_len check (char_length(token_hash) = 64)
);

create unique index if not exists email_change_requests_token_hash_key on public.email_change_requests (token_hash);
create index if not exists email_change_requests_user_id_idx on public.email_change_requests (user_id);

alter table public.email_change_requests enable row level security;
revoke all on table public.email_change_requests from anon, authenticated;

drop policy if exists email_change_requests_deny_anon on public.email_change_requests;
create policy email_change_requests_deny_anon
  on public.email_change_requests
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists email_change_requests_deny_authenticated on public.email_change_requests;
create policy email_change_requests_deny_authenticated
  on public.email_change_requests
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
