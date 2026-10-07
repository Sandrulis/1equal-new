alter table public.teams add column if not exists content_updated_at timestamptz not null default now();

create or replace function public.touch_team_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_table_name = 'teams' then
    if tg_op = 'UPDATE' then
      new.content_updated_at := clock_timestamp();
    end if;
    return new;
  end if;

  target := case when tg_op = 'DELETE' then old.team_id else new.team_id end;
  if target is not null then
    update public.teams
    set content_updated_at = clock_timestamp()
    where id = target;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.touch_team_content() from public, anon, authenticated;

drop trigger if exists teams_touch_content on public.teams;
create trigger teams_touch_content
  before update on public.teams
  for each row
  execute function public.touch_team_content();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'team_members',
    'team_events',
    'team_event_rsvps',
    'subteams',
    'venues',
    'balance_entries',
    'team_ledger',
    'team_player_invites',
    'team_member_subteams',
    'finance_reservations'
  ]
  loop
    if to_regclass('public.' || tbl) is not null then
      execute format('drop trigger if exists %I on public.%I', tbl || '_touch_team', tbl);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.touch_team_content()',
        tbl || '_touch_team',
        tbl
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
