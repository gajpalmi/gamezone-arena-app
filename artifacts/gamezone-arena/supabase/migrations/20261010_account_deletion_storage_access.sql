begin;

create or replace function public.account_deletion_media_path_allowed(
  p_bucket text,
  p_path text
)
returns boolean
language sql
security definer
set search_path=public,pg_temp
as $$
  select
    nullif(btrim(auth.jwt()->>'sub'),'') is not null
    and p_bucket in ('business-media','job-private-media')
    and exists (
      select 1
      from public.account_deletion_requests request
      where request.owner_user_id=auth.jwt()->>'sub'
        and p_path=any(request.media_paths)
    );
$$;

revoke all on function public.account_deletion_media_path_allowed(text,text) from public;
grant execute on function public.account_deletion_media_path_allowed(text,text) to anon,authenticated;

drop policy if exists "account deletion removes business media" on storage.objects;
create policy "account deletion removes business media"
on storage.objects for delete to anon,authenticated
using (
  storage.objects.bucket_id='business-media'
  and public.account_deletion_media_path_allowed(
    storage.objects.bucket_id,
    storage.objects.name
  )
);

drop policy if exists "account deletion removes job private media" on storage.objects;
create policy "account deletion removes job private media"
on storage.objects for delete to anon,authenticated
using (
  storage.objects.bucket_id='job-private-media'
  and public.account_deletion_media_path_allowed(
    storage.objects.bucket_id,
    storage.objects.name
  )
);

commit;