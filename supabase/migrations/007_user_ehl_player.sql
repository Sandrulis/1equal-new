alter table public.users add column if not exists ehl_player jsonb;

drop function if exists public.update_own_profile(text, text);
drop function if exists public.update_own_profile(text, text, jsonb, boolean);

create or replace function public.update_own_profile(
  user_first_name text,
  user_last_name text,
  user_ehl_player jsonb default null,
  user_ehl_set boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_first text;
  display_last text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  display_first := coalesce(pg_catalog.btrim(user_first_name), '');
  display_last := coalesce(pg_catalog.btrim(user_last_name), '');

  update public.users
  set
    first_name = display_first,
    last_name = display_last,
    name = pg_catalog.btrim(display_first || ' ' || display_last),
    ehl_player = case when user_ehl_set then user_ehl_player else ehl_player end
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, text, jsonb, boolean) from public, anon;
grant execute on function public.update_own_profile(text, text, jsonb, boolean) to authenticated;
