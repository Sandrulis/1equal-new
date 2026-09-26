drop function if exists public.update_own_profile(text, text, jsonb, boolean);

create or replace function public.update_own_profile(
  user_first_name text,
  user_last_name text,
  user_ehl_team text default null,
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
  stored jsonb;
  base jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  display_first := coalesce(pg_catalog.btrim(user_first_name), '');
  display_last := coalesce(pg_catalog.btrim(user_last_name), '');

  select users.ehl_player into stored
  from public.users
  where users.id = auth.uid();

  base := case
    when stored is null or pg_catalog.jsonb_typeof(stored) <> 'object' or stored ? 'sourceUrl' then '{}'::jsonb
    else stored
  end;

  if user_ehl_set and user_ehl_team ~ '^[A-Z0-9]{4,16}$' then
    if user_ehl_player is null then
      base := base - user_ehl_team;
    else
      base := pg_catalog.jsonb_set(base, array[user_ehl_team], user_ehl_player, true);
    end if;
  end if;

  update public.users
  set
    first_name = display_first,
    last_name = display_last,
    name = pg_catalog.btrim(display_first || ' ' || display_last),
    ehl_player = case when user_ehl_set and user_ehl_team ~ '^[A-Z0-9]{4,16}$' then base else ehl_player end
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, text, text, jsonb, boolean) from public, anon;
grant execute on function public.update_own_profile(text, text, text, jsonb, boolean) to authenticated;
