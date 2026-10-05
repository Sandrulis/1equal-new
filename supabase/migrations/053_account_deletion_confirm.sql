create table if not exists public.account_deletion_confirmations (
  user_id uuid primary key references public.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint account_deletion_confirmations_token_len check (char_length(token_hash) = 64)
);

create unique index if not exists account_deletion_confirmations_token_hash_key
  on public.account_deletion_confirmations (token_hash);

alter table public.account_deletion_confirmations enable row level security;
revoke all on table public.account_deletion_confirmations from anon, authenticated;

drop policy if exists account_deletion_confirmations_deny_anon on public.account_deletion_confirmations;
create policy account_deletion_confirmations_deny_anon
  on public.account_deletion_confirmations
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists account_deletion_confirmations_deny_authenticated on public.account_deletion_confirmations;
create policy account_deletion_confirmations_deny_authenticated
  on public.account_deletion_confirmations
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
