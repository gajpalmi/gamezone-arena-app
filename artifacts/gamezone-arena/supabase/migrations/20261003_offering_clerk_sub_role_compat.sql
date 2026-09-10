begin;

-- Depends on 20261001_business_offering_authenticated_draft_save.sql, which
-- owns the already-reviewed save-draft implementation and its anon grant.

create or replace function public.business_offering_actor_can_manage(p_offering_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
    and exists (
      select 1
      from public.business_offerings o
      where o.id = p_offering_id
        and o.owner_user_id = auth.jwt() ->> 'sub'
        and o.status in ('draft', 'rejected')
    );
$$;

create or replace function public.business_offering_actor_owns_photo(p_photo_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
    and exists (
      select 1
      from public.business_offering_photos p
      join public.business_offerings o on o.id = p.offering_id
      where p.id = p_photo_id
        and p.created_by = auth.jwt() ->> 'sub'
        and o.owner_user_id = auth.jwt() ->> 'sub'
        and p.storage_path like 'offerings/%'
        and split_part(p.storage_path, '/', 1) = 'offerings'
        and split_part(p.storage_path, '/', 2) = auth.jwt() ->> 'sub'
        and split_part(p.storage_path, '/', 3) = p.offering_id::text
        and split_part(p.storage_path, '/', 4) <> ''
    );
$$;

create or replace function public.business_offering_actor_can_manage_photo(p_photo_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.business_offering_actor_owns_photo(p_photo_id)
    and exists (
      select 1
      from public.business_offering_photos p
      join public.business_offerings o on o.id = p.offering_id
      where p.id = p_photo_id
        and o.status in ('draft', 'rejected')
    );
$$;

create or replace function public.business_offering_actor_can_read_media(p_path text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
    and exists (
      select 1
      from public.business_offering_photos p
      join public.business_offerings o on o.id = p.offering_id
      where p.storage_path = p_path
        and p.created_by = auth.jwt() ->> 'sub'
        and o.owner_user_id = auth.jwt() ->> 'sub'
    );
$$;

create or replace function public.business_offering_actor_can_delete_media(p_path text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
    and exists (
      select 1
      from public.business_offering_photos p
      join public.business_offerings o on o.id = p.offering_id
      where p.storage_path = p_path
        and p.created_by = auth.jwt() ->> 'sub'
        and o.owner_user_id = auth.jwt() ->> 'sub'
        and o.status in ('draft', 'rejected')
    );
$$;

revoke all on function public.business_offering_actor_can_manage(uuid),
  public.business_offering_actor_owns_photo(uuid),
  public.business_offering_actor_can_manage_photo(uuid),
  public.business_offering_actor_can_read_media(text),
  public.business_offering_actor_can_delete_media(text)
from public, anon;

grant execute on function public.business_offering_actor_can_manage(uuid),
  public.business_offering_actor_owns_photo(uuid),
  public.business_offering_actor_can_manage_photo(uuid),
  public.business_offering_actor_can_read_media(text),
  public.business_offering_actor_can_delete_media(text)
to anon;

create policy "anon owners read own offerings"
on public.business_offerings
for select
to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and owner_user_id = auth.jwt() ->> 'sub'
);

create policy "anon owners delete own offerings"
on public.business_offerings
for delete
to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and owner_user_id = auth.jwt() ->> 'sub'
  and status in ('draft', 'rejected')
);

create policy "anon owners read offering photos"
on public.business_offering_photos
for select
to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and public.business_offering_actor_owns_photo(id)
);

create policy "anon owners insert offering photos"
on public.business_offering_photos
for insert
to anon
with check (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and public.business_offering_actor_can_manage(offering_id)
  and created_by = auth.jwt() ->> 'sub'
  and storage_path like 'offerings/%'
  and split_part(storage_path, '/', 1) = 'offerings'
  and split_part(storage_path, '/', 2) = auth.jwt() ->> 'sub'
  and split_part(storage_path, '/', 3) = offering_id::text
  and split_part(storage_path, '/', 4) <> ''
);

create policy "anon owners delete offering photos"
on public.business_offering_photos
for delete
to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and public.business_offering_actor_can_manage_photo(id)
);

create policy "anon owners upload offering media"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'business-media'
  and nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and (storage.foldername(storage.objects.name))[1] = 'offerings'
  and (storage.foldername(storage.objects.name))[2] = auth.jwt() ->> 'sub'
  and (storage.foldername(storage.objects.name))[3] ~ '^[0-9a-fA-F-]{36}$'
  and coalesce(array_length(storage.foldername(storage.objects.name), 1), 0) >= 3
  and storage.filename(storage.objects.name) <> ''
  and lower(storage.extension(storage.objects.name)) in ('jpg', 'jpeg', 'png', 'webp')
  and public.business_offering_actor_can_manage(
    (storage.foldername(storage.objects.name))[3]::uuid
  )
);

create policy "anon owners read offering media"
on storage.objects
for select
to anon
using (
  bucket_id = 'business-media'
  and nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and (storage.foldername(storage.objects.name))[1] = 'offerings'
  and (storage.foldername(storage.objects.name))[2] = auth.jwt() ->> 'sub'
  and (storage.foldername(storage.objects.name))[3] ~ '^[0-9a-fA-F-]{36}$'
  and coalesce(array_length(storage.foldername(storage.objects.name), 1), 0) >= 3
  and storage.filename(storage.objects.name) <> ''
  and public.business_offering_actor_can_read_media(storage.objects.name)
);

create policy "anon owners delete offering media"
on storage.objects
for delete
to anon
using (
  bucket_id = 'business-media'
  and nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and (storage.foldername(storage.objects.name))[1] = 'offerings'
  and (storage.foldername(storage.objects.name))[2] = auth.jwt() ->> 'sub'
  and (storage.foldername(storage.objects.name))[3] ~ '^[0-9a-fA-F-]{36}$'
  and coalesce(array_length(storage.foldername(storage.objects.name), 1), 0) >= 3
  and storage.filename(storage.objects.name) <> ''
  and public.business_offering_actor_can_delete_media(storage.objects.name)
);

revoke execute on function public.business_offering_prepare_photo(uuid, text),
  public.business_offering_submit(uuid),
  public.business_offering_set_enabled(uuid, boolean)
from public, anon;

grant execute on function public.business_offering_prepare_photo(uuid, text),
  public.business_offering_submit(uuid),
  public.business_offering_set_enabled(uuid, boolean),
  public.business_offering_can_interact(uuid, boolean),
  public.business_offering_add_to_basket(uuid),
  public.business_offering_cancel_basket_item(uuid)
to anon;

-- Signed-in marketplace interactions also arrive as anon when the Clerk token
-- has a valid subject but no Supabase role claim. These policies reproduce the
-- existing authenticated predicates without allowing subject-less requests.
create policy "anon users read own offering favorites"
on public.business_offering_favorites for select to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
);

create policy "anon users add safe offering favorites"
on public.business_offering_favorites for insert to anon
with check (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
  and public.business_offering_can_interact(offering_id, true)
);

create policy "anon users delete own offering favorites"
on public.business_offering_favorites for delete to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
);

create policy "anon users read allowed offering reviews"
on public.business_offering_reviews for select to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and (
    (is_approved and public.business_offering_can_interact(offering_id, false))
    or user_id = auth.jwt() ->> 'sub'
  )
);

create policy "anon users add safe offering reviews"
on public.business_offering_reviews for insert to anon
with check (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
  and is_approved
  and public.business_offering_can_interact(offering_id, true)
);

create policy "anon users update own offering reviews"
on public.business_offering_reviews for update to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
)
with check (
  user_id = auth.jwt() ->> 'sub'
  and is_approved
  and public.business_offering_can_interact(offering_id, true)
);

create policy "anon users delete own offering reviews"
on public.business_offering_reviews for delete to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
);

create policy "anon users insert offering reports"
on public.business_offering_reports for insert to anon
with check (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and reporter_id = auth.jwt() ->> 'sub'
);

create policy "anon users read own offering blocks"
on public.business_offering_blocks for select to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
);

create policy "anon users add safe offering blocks"
on public.business_offering_blocks for insert to anon
with check (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
  and public.business_offering_can_interact(offering_id, false)
);

create policy "anon users delete own offering blocks"
on public.business_offering_blocks for delete to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and user_id = auth.jwt() ->> 'sub'
);

grant select on public.business_offering_basket to anon;
create policy "anon buyers read only own basket"
on public.business_offering_basket for select to anon
using (
  nullif(btrim(auth.jwt() ->> 'sub'), '') is not null
  and buyer_id = auth.jwt() ->> 'sub'
);

commit;