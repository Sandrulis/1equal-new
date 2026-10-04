create table if not exists public.site_user_feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null default '',
  body text not null default '',
  rating smallint,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint site_user_feedback_kind_check check (kind in ('bug', 'suggestion', 'feedback')),
  constraint site_user_feedback_title_len check (
    (kind = 'feedback' and char_length(title) <= 200)
    or (kind <> 'feedback' and char_length(btrim(title)) between 1 and 200)
  ),
  constraint site_user_feedback_body_len check (char_length(btrim(body)) between 2 and 4000),
  constraint site_user_feedback_rating_kind check (
    (kind = 'feedback' and rating between 1 and 5)
    or (kind <> 'feedback' and rating is null)
  )
);

create index if not exists site_user_feedback_created_idx
  on public.site_user_feedback (created_at desc);

alter table public.site_user_feedback enable row level security;

revoke all on table public.site_user_feedback from anon, authenticated;

drop policy if exists site_user_feedback_deny_anon on public.site_user_feedback;
create policy site_user_feedback_deny_anon
  on public.site_user_feedback
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists site_user_feedback_deny_authenticated on public.site_user_feedback;
create policy site_user_feedback_deny_authenticated
  on public.site_user_feedback
  for all
  to authenticated
  using (false)
  with check (false);
