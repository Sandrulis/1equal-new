create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_is_admin_idx
  on public.users (is_admin)
  where is_admin = true;

alter table public.users enable row level security;

revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;

drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users
  for select
  to authenticated
  using (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
  display_name text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.users.first_admin'));

  select not exists (select 1 from public.users) into first_user;

  display_name := nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');

  insert into public.users (id, email, name, is_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(display_name, ''),
    first_user
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
