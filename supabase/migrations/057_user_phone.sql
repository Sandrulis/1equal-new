alter table public.users
  add column if not exists phone text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_phone_len') then
    alter table public.users add constraint users_phone_len check (char_length(phone) <= 40);
  end if;
end $$;

update public.users as account
set phone = member.phone
from (
  select distinct on (user_id) user_id, phone
  from public.team_members
  where phone <> ''
  order by user_id, updated_at desc
) as member
where account.id = member.user_id
  and account.phone = '';

notify pgrst, 'reload schema';
