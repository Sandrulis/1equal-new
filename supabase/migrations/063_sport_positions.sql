create table if not exists public.sport_positions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports (id) on delete cascade,
  code text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sport_positions_code check (code ~ '^[A-Z0-9]{1,8}$'),
  constraint sport_positions_sport_code unique (sport_id, code)
);

create table if not exists public.sport_position_names (
  position_id uuid not null references public.sport_positions (id) on delete cascade,
  language_code text not null references public.site_languages (code) on delete cascade,
  name text not null,
  primary key (position_id, language_code),
  constraint sport_position_names_len check (char_length(btrim(name)) between 1 and 80)
);

create index if not exists sport_positions_sport_idx on public.sport_positions (sport_id, sort_order);

alter table public.sport_positions enable row level security;
alter table public.sport_position_names enable row level security;

revoke all on table public.sport_positions from anon, authenticated;
revoke all on table public.sport_position_names from anon, authenticated;

drop policy if exists sport_positions_deny_anon on public.sport_positions;
create policy sport_positions_deny_anon on public.sport_positions for all to anon using (false) with check (false);
drop policy if exists sport_positions_deny_authenticated on public.sport_positions;
create policy sport_positions_deny_authenticated on public.sport_positions for all to authenticated using (false) with check (false);

drop policy if exists sport_position_names_deny_anon on public.sport_position_names;
create policy sport_position_names_deny_anon on public.sport_position_names for all to anon using (false) with check (false);
drop policy if exists sport_position_names_deny_authenticated on public.sport_position_names;
create policy sport_position_names_deny_authenticated on public.sport_position_names for all to authenticated using (false) with check (false);

alter table public.team_members drop constraint if exists team_members_extra_positions_len;
alter table public.team_members
  add constraint team_members_extra_positions_len check (char_length(extra_positions) <= 200);

do $$
declare
  sport uuid;
  pos uuid;
  codes text[] := array['LW', 'C', 'RW', 'D', 'G'];
  orders int[] := array[0, 1, 2, 3, 4];
  lv text[] := array['Kreisais uzbrucējs', 'Centrs', 'Labais uzbrucējs', 'Aizsargs', 'Vārtsargs'];
  en text[] := array['Left wing', 'Center', 'Right wing', 'Defender', 'Goalie'];
  ru text[] := array['Левый нападающий', 'Центральный нападающий', 'Правый нападающий', 'Защитник', 'Вратарь'];
  i int;
begin
  for sport in
    select s.id
    from public.sports s
    where not exists (select 1 from public.sport_positions p where p.sport_id = s.id)
      and (
        s.icon in ('hockey-puck', 'hockey')
        or exists (
          select 1 from public.sport_names n
          where n.sport_id = s.id
            and lower(btrim(n.name)) in ('hokejs', 'hockey', 'хоккей')
        )
        or exists (
          select 1
          from public.teams t
          join public.team_members m on m.team_id = t.id
          where t.sport_id = s.id
            and (
              upper(btrim(m.position)) in ('LW', 'C', 'RW', 'D', 'G', 'LD', 'RD')
              or m.extra_positions ~* '(^|,)[[:space:]]*(LW|C|RW|D|G|LD|RD)[[:space:]]*(,|$)'
            )
        )
      )
  loop
    for i in 1..5 loop
      insert into public.sport_positions (sport_id, code, sort_order)
      values (sport, codes[i], orders[i])
      returning id into pos;

      insert into public.sport_position_names (position_id, language_code, name)
      select pos, lang.code,
        case lang.code
          when 'lv' then lv[i]
          when 'ru' then ru[i]
          else en[i]
        end
      from public.site_languages lang;
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';
