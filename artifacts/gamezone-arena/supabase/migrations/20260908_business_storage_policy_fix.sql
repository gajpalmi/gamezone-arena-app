begin;

-- Qualify the object path explicitly so PostgreSQL does not bind "name" to
-- public.businesses.name inside the policy subqueries.
drop policy if exists "business media authorized reads" on storage.objects;
create policy "business media authorized reads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-media'
  and exists (
    select 1
    from public.business_photos p
    join public.businesses b on b.id = p.business_id
    where p.storage_path = storage.objects.name
      and (
        b.owner_id = auth.jwt() ->> 'sub'
        or b.status = 'approved'
        or exists (
          select 1
          from public.business_admins a
          where a.user_id = auth.jwt() ->> 'sub'
        )
      )
  )
);

drop policy if exists "business media owner uploads" on storage.objects;
create policy "business media owner uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-media'
  and lower(storage.extension(storage.objects.name)) in ('jpg', 'jpeg', 'png', 'webp')
  and (storage.foldername(storage.objects.name))[1] = auth.jwt() ->> 'sub'
  and exists (
    select 1
    from public.businesses b
    where b.id::text = (storage.foldername(storage.objects.name))[2]
      and b.owner_id = auth.jwt() ->> 'sub'
      and b.status in ('draft', 'pending', 'rejected')
  )
);

-- Remove direct anon execution and execution inherited through PostgreSQL's
-- PUBLIC role. Existing explicit authenticated grants remain unchanged.
revoke execute on function public.business_submit(uuid) from public, anon;
revoke execute on function public.business_prepare_photo(uuid, text) from public, anon;
revoke execute on function public.business_is_admin() from public, anon;
revoke execute on function public.business_admin_moderate(public.business_moderation_target, uuid, text, text) from public, anon;
revoke execute on function public.business_delete_user_data() from public, anon;
revoke execute on function public.business_validate_report() from public, anon;

commit;