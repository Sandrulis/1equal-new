insert into public.site_frontend_modules (module_key, is_enabled, sort_order)
values ('module_entuziasti', true, 40)
on conflict (module_key) do nothing;

insert into public.sport_modules (sport_id, module_key)
select id, 'module_entuziasti'
from public.sports
on conflict (sport_id, module_key) do nothing;

notify pgrst, 'reload schema';
