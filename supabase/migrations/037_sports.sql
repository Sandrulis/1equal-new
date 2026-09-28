create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'hockey',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_icon check (icon in ('hockey', 'ball', 'basket', 'racket', 'swim', 'run'))
);

create table if not exists public.sport_names (
  sport_id uuid not null references public.sports (id) on delete cascade,
  language_code text not null references public.site_languages (code) on delete cascade,
  name text not null,
  primary key (sport_id, language_code),
  constraint sport_names_len check (char_length(btrim(name)) between 1 and 80)
);

create table if not exists public.sport_modules (
  sport_id uuid not null references public.sports (id) on delete cascade,
  module_key text not null references public.site_frontend_modules (module_key) on delete cascade,
  primary key (sport_id, module_key)
);

create index if not exists sport_modules_module_idx on public.sport_modules (module_key);

alter table public.sports enable row level security;
alter table public.sport_names enable row level security;
alter table public.sport_modules enable row level security;

revoke all on table public.sports from anon, authenticated;
revoke all on table public.sport_names from anon, authenticated;
revoke all on table public.sport_modules from anon, authenticated;

drop policy if exists sports_deny_anon on public.sports;
create policy sports_deny_anon on public.sports for all to anon using (false) with check (false);
drop policy if exists sports_deny_authenticated on public.sports;
create policy sports_deny_authenticated on public.sports for all to authenticated using (false) with check (false);

drop policy if exists sport_names_deny_anon on public.sport_names;
create policy sport_names_deny_anon on public.sport_names for all to anon using (false) with check (false);
drop policy if exists sport_names_deny_authenticated on public.sport_names;
create policy sport_names_deny_authenticated on public.sport_names for all to authenticated using (false) with check (false);

drop policy if exists sport_modules_deny_anon on public.sport_modules;
create policy sport_modules_deny_anon on public.sport_modules for all to anon using (false) with check (false);
drop policy if exists sport_modules_deny_authenticated on public.sport_modules;
create policy sport_modules_deny_authenticated on public.sport_modules for all to authenticated using (false) with check (false);

create or replace function public.sports_keep_one_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_active and not exists (select 1 from public.sports where id <> old.id and is_active) then
      raise exception 'sports_need_one' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.is_active and not new.is_active then
    if not exists (select 1 from public.sports where id <> new.id and is_active) then
      raise exception 'sports_need_one' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sports_keep_one_active on public.sports;
create trigger sports_keep_one_active
  before update or delete on public.sports
  for each row
  execute function public.sports_keep_one_active();

revoke all on function public.sports_keep_one_active() from public, anon, authenticated;

alter table public.teams add column if not exists sport_id uuid references public.sports (id);

do $$
declare
  sport uuid;
begin
  if not exists (select 1 from public.sports) then
    insert into public.sports (icon, is_active, sort_order)
    values ('hockey', true, 0)
    returning id into sport;

    insert into public.sport_names (sport_id, language_code, name)
    select sport, code,
      case code
        when 'lv' then 'Hokejs'
        when 'en' then 'Hockey'
        when 'ru' then 'Хоккей'
        else 'Hockey'
      end
    from public.site_languages;

    insert into public.sport_modules (sport_id, module_key)
    select sport, module_key
    from public.site_frontend_modules;
  end if;
end $$;

update public.teams
set sport_id = (select id from public.sports where is_active order by sort_order, created_at limit 1)
where sport_id is null
  and exists (select 1 from public.sports where is_active);

do $$
begin
  if not exists (select 1 from public.teams where sport_id is null) then
    alter table public.teams alter column sport_id set not null;
  end if;
end $$;

create index if not exists teams_sport_idx on public.teams (sport_id);

notify pgrst, 'reload schema';
