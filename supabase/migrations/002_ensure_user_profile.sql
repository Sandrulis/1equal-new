create or replace function public.ensure_user_profile(user_id uuid, user_email text, user_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.users.first_admin'));

  select not exists (select 1 from public.users) into first_user;

  insert into public.users (id, email, name, is_admin)
  values (
    user_id,
    coalesce(user_email, ''),
    coalesce(user_name, ''),
    first_user
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_user_profile(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ensure_user_profile(uuid, text, text) to service_role;
