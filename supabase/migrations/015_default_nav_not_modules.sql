delete from public.site_frontend_modules
where module_key in ('module_calendar', 'module_team', 'module_venues');

notify pgrst, 'reload schema';
