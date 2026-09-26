create table if not exists public.rate_limit_buckets (
  bucket text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(bucket text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  if bucket is null or char_length(bucket) = 0 or char_length(bucket) > 200 or max_hits < 1 or window_seconds < 1 then
    return true;
  end if;

  insert into public.rate_limit_buckets as existing (bucket, hits, window_start)
  values (bucket, 1, now())
  on conflict (bucket) do update
  set
    hits = case
      when existing.window_start <= now() - make_interval(secs => window_seconds) then 1
      else existing.hits + 1
    end,
    window_start = case
      when existing.window_start <= now() - make_interval(secs => window_seconds) then now()
      else existing.window_start
    end
  returning hits into current_hits;

  return current_hits > max_hits;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb
);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from anon, authenticated;

notify pgrst, 'reload schema';
