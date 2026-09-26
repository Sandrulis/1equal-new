drop policy if exists branding_public_read on storage.objects;

drop function if exists public.update_own_profile(text, text);
drop function if exists public.update_own_profile(text, text, jsonb, boolean);
drop function if exists public.update_own_profile(text, text, text, jsonb, boolean);

notify pgrst, 'reload schema';
