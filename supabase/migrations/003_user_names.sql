alter table public.users add column if not exists first_name text not null default '';
alter table public.users add column if not exists last_name text not null default '';

update public.users
set first_name = name
where first_name = ''
  and last_name = ''
  and name <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
  display_first text;
  display_last text;
  display_name text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.users.first_admin'));

  select not exists (select 1 from public.users) into first_user;

  display_first := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  display_last := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  if display_first is null then
    display_first := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  end if;
  display_name := nullif(pg_catalog.btrim(coalesce(display_first, '') || ' ' || coalesce(display_last, '')), '');

  insert into public.users (id, email, name, first_name, last_name, is_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(display_name, ''),
    coalesce(display_first, ''),
    coalesce(display_last, ''),
    first_user
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop function if exists public.ensure_user_profile(uuid, text, text);

create or replace function public.ensure_user_profile(
  user_id uuid,
  user_email text,
  user_first_name text,
  user_last_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
  display_first text;
  display_last text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.users.first_admin'));

  select not exists (select 1 from public.users) into first_user;

  display_first := coalesce(pg_catalog.btrim(user_first_name), '');
  display_last := coalesce(pg_catalog.btrim(user_last_name), '');

  insert into public.users (id, email, name, first_name, last_name, is_admin)
  values (
    user_id,
    coalesce(user_email, ''),
    pg_catalog.btrim(display_first || ' ' || display_last),
    display_first,
    display_last,
    first_user
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_user_profile(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.ensure_user_profile(uuid, text, text, text) to service_role;

create or replace function public.update_own_profile(user_first_name text, user_last_name text)
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
    name = pg_catalog.btrim(display_first || ' ' || display_last)
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, text) from public, anon;
grant execute on function public.update_own_profile(text, text) to authenticated;
