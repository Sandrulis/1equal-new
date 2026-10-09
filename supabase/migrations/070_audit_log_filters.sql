alter table public.audit_log add column if not exists team_id uuid;
alter table public.audit_log add column if not exists status text not null default 'ok';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_log_status_check') then
    alter table public.audit_log
      add constraint audit_log_status_check check (status in ('ok', 'error'));
  end if;
end $$;

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);
create index if not exists audit_log_team_idx on public.audit_log (team_id);
create index if not exists audit_log_status_idx on public.audit_log (status);

notify pgrst, 'reload schema';
