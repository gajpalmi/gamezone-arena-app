begin;

-- Clerk supplies a valid JWT subject even when PostgREST maps the request to
-- anon.  These grants do not weaken either RPC: both functions validate the
-- subject and the business owner/status before changing anything.
grant execute on function public.business_prepare_photo(uuid, text) to anon;
grant execute on function public.business_submit(uuid) to anon;

-- Keep storage RLS predicates free of cross-table lookups.  These definer
-- helpers perform the lookups with a fixed search path and derive the actor
-- exclusively from the current JWT.
create function public.business_media_clerk_owner_path_allowed(p_object_path text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    nullif(auth.jwt() ->> 'sub', '') is not null
    and (storage.foldername(p_object_path))[1] = auth.jwt() ->> 'sub'
    and exists (
      select 1
      from public.businesses b
      where b.id::text = (storage.foldername(p_object_path))[2]
        and b.owner_id = auth.jwt() ->> 'sub'
        and b.status in ('draft', 'pending', 'rejected')
    );
$$;

create function public.business_media_clerk_read_allowed(p_object_path text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
      select 1
      from public.business_photos p
      join public.businesses b on b.id = p.business_id
      where p.storage_path = p_object_path
        and (
          b.status = 'approved'
          or (
            nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
            and (
              b.owner_id = auth.jwt() ->> 'sub'
              or exists (
                select 1
                from public.business_admins a
                where a.user_id = auth.jwt() ->> 'sub'
              )
            )
          )
        )
    );
$$;

revoke all on function public.business_media_clerk_owner_path_allowed(text),
  public.business_media_clerk_read_allowed(text)
from public;
grant execute on function public.business_media_clerk_owner_path_allowed(text),
  public.business_media_clerk_read_allowed(text)
to anon, authenticated;

-- Keep the authenticated policies unchanged while allowing the same
-- owner/admin checks for requests whose PostgREST role is anon.  The subject
-- must be present and non-empty for every compatibility operation.
create policy "business media clerk anon owner uploads"
on storage.objects
for insert
to anon
with check (
  storage.objects.bucket_id = 'business-media'
  and lower(storage.extension(storage.objects.name)) in ('jpg', 'jpeg', 'png', 'webp')
  and public.business_media_clerk_owner_path_allowed(storage.objects.name)
);

create policy "business media clerk anon owner updates"
on storage.objects
for update
to anon
using (
  storage.objects.bucket_id = 'business-media'
  and public.business_media_clerk_owner_path_allowed(storage.objects.name)
)
with check (
  storage.objects.bucket_id = 'business-media'
  and public.business_media_clerk_owner_path_allowed(storage.objects.name)
  and lower(storage.extension(storage.objects.name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "business media clerk anon owner deletes"
on storage.objects
for delete
to anon
using (
  storage.objects.bucket_id = 'business-media'
  and public.business_media_clerk_owner_path_allowed(storage.objects.name)
);

create policy "business media clerk anon authorized reads"
on storage.objects
for select
to anon
using (
  storage.objects.bucket_id = 'business-media'
  and public.business_media_clerk_read_allowed(storage.objects.name)
);

commit;