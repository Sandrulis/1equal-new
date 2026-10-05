alter table public.users
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_due_at timestamptz,
  add column if not exists deletion_claimed_at timestamptz;

create index if not exists users_deletion_due_idx
  on public.users (deletion_due_at)
  where deletion_due_at is not null;

create or replace function public.claim_due_account_deletions(batch_size integer)
returns table (user_id uuid, user_email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select users.id
    from public.users as users
    where users.deletion_due_at is not null
      and users.deletion_due_at <= pg_catalog.now()
      and (
        users.deletion_claimed_at is null
        or users.deletion_claimed_at < pg_catalog.now() - interval '15 minutes'
      )
    order by users.deletion_due_at
    limit greatest(1, least(coalesce(batch_size, 20), 50))
    for update skip locked
  )
  update public.users as account
  set deletion_claimed_at = pg_catalog.now()
  from due
  where account.id = due.id
  returning account.id, account.email;
end;
$$;

revoke all on function public.claim_due_account_deletions(integer) from public, anon, authenticated;
grant execute on function public.claim_due_account_deletions(integer) to service_role;

create or replace function public.release_user_for_deletion(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.teams as team
  set leader_id = (
    select member.user_id
    from public.team_members as member
    where member.team_id = team.id
      and member.user_id <> target
    order by member.is_team_admin desc, member.joined_on asc
    limit 1
  )
  where team.leader_id = target;

  update public.balance_entries
  set created_by = null
  where created_by = target;
end;
$$;

revoke all on function public.release_user_for_deletion(uuid) from public, anon, authenticated;
grant execute on function public.release_user_for_deletion(uuid) to service_role;

notify pgrst, 'reload schema';
