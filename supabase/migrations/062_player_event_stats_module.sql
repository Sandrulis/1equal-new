insert into public.site_frontend_modules (module_key, is_enabled, is_individual, sort_order)
values ('module_player_event_stats', false, false, 60)
on conflict (module_key) do update
set sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
