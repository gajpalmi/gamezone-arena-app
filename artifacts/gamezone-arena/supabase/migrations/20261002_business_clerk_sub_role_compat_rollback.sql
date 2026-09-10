begin;

drop policy if exists "business media clerk anon owner uploads" on storage.objects;
drop policy if exists "business media clerk anon owner updates" on storage.objects;
drop policy if exists "business media clerk anon owner deletes" on storage.objects;
drop policy if exists "business media clerk anon authorized reads" on storage.objects;

revoke execute on function public.business_prepare_photo(uuid, text) from anon;
revoke execute on function public.business_submit(uuid) from anon;

drop function if exists public.business_media_clerk_owner_path_allowed(text);
drop function if exists public.business_media_clerk_read_allowed(text);

commit;