revoke all on table public.admin_team_watches from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.email_templates from anon, authenticated;
revoke all on table public.rate_limit_buckets from anon, authenticated;
revoke all on table public.user_todos from anon, authenticated;

drop policy if exists admin_team_watches_deny_anon on public.admin_team_watches;
create policy admin_team_watches_deny_anon
  on public.admin_team_watches
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists admin_team_watches_deny_authenticated on public.admin_team_watches;
create policy admin_team_watches_deny_authenticated
  on public.admin_team_watches
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists audit_log_deny_anon on public.audit_log;
create policy audit_log_deny_anon
  on public.audit_log
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists audit_log_deny_authenticated on public.audit_log;
create policy audit_log_deny_authenticated
  on public.audit_log
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists email_templates_deny_anon on public.email_templates;
create policy email_templates_deny_anon
  on public.email_templates
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists email_templates_deny_authenticated on public.email_templates;
create policy email_templates_deny_authenticated
  on public.email_templates
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists rate_limit_buckets_deny_anon on public.rate_limit_buckets;
create policy rate_limit_buckets_deny_anon
  on public.rate_limit_buckets
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists rate_limit_buckets_deny_authenticated on public.rate_limit_buckets;
create policy rate_limit_buckets_deny_authenticated
  on public.rate_limit_buckets
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists user_todos_deny_anon on public.user_todos;
create policy user_todos_deny_anon
  on public.user_todos
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists user_todos_deny_authenticated on public.user_todos;
create policy user_todos_deny_authenticated
  on public.user_todos
  for all
  to authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
