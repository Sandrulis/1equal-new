update public.team_events as event
set lineup = jsonb_set(event.lineup, '{slots}', cleaned.slots)
from (
  select
    event_row.id,
    coalesce((
      select jsonb_object_agg(kept.slot, to_jsonb(kept.member_id))
      from (
        select distinct on (raw.member_id) raw.slot, raw.member_id
        from (
          select entry.key as slot, entry.value #>> '{}' as member_id, entry.key::int as slot_n
          from jsonb_each(coalesce(event_row.lineup -> 'slots', '{}'::jsonb)) as entry
          where entry.key ~ '^[0-9]+$'
            and entry.key::int between 1 and 16
            and jsonb_typeof(entry.value) = 'string'
            and btrim(entry.value #>> '{}') <> ''
        ) as raw
        order by raw.member_id, raw.slot_n
      ) as kept
    ), '{}'::jsonb) as slots
  from public.team_events as event_row
  where jsonb_typeof(event_row.lineup -> 'slots') = 'object'
) as cleaned
where event.id = cleaned.id
  and event.lineup -> 'slots' is distinct from cleaned.slots;
