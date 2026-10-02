create or replace function public.member_balance_totals(team_ids uuid[])
returns table (team_id uuid, user_id uuid, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select e.team_id, e.user_id, round(coalesce(sum(e.amount), 0), 2) as total
  from public.balance_entries e
  where e.team_id = any(team_ids)
  group by e.team_id, e.user_id;
$$;

revoke all on function public.member_balance_totals(uuid[]) from public, anon, authenticated;
grant execute on function public.member_balance_totals(uuid[]) to service_role;
