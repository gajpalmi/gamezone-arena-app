begin;

-- A listing cannot be published without the contact and legal disclosures a
-- customer needs.  Versions are retained so a future policy change can be
-- re-accepted explicitly.
alter table public.businesses
  add column if not exists owner_name text,
  add column if not exists whatsapp text,
  add column if not exists service_areas text[] not null default '{}'::text[],
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists listing_rules_version text,
  add column if not exists listing_rules_accepted_at timestamptz;

alter table public.businesses
  add constraint businesses_owner_name_length check (owner_name is null or char_length(trim(owner_name)) between 2 and 120),
  add constraint businesses_phone_format check (phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  add constraint businesses_whatsapp_format check (whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  add constraint businesses_website_scheme check (website is null or website ~* '^https?://[^[:space:]]+$'),
  add constraint businesses_service_areas_length check (cardinality(service_areas) <= 20),
  add constraint businesses_required_submission check (
    char_length(trim(name)) >= 2 and category_id is not null and
    char_length(trim(coalesce(city, ''))) >= 2 and phone is not null and
    terms_version = '2026-09-06' and terms_accepted_at is not null and
    privacy_version = '2026-09-06' and privacy_accepted_at is not null and
    listing_rules_version = '2026-09-06' and listing_rules_accepted_at is not null
  );

-- Media is private: an authorized storage read is required before Supabase
-- can issue a short-lived signed URL.
update storage.buckets set public = false where id = 'business-media';
drop policy if exists "business media public reads" on storage.objects;
create policy "business media authorized reads" on storage.objects for select to authenticated using (
  bucket_id = 'business-media' and exists (
    select 1 from public.business_photos p
    join public.businesses b on b.id = p.business_id
    where p.storage_path = name and (
      b.owner_id = auth.jwt() ->> 'sub' or b.status = 'approved' or
      exists (select 1 from public.business_admins a where a.user_id = auth.jwt() ->> 'sub')
    )
  )
);
drop policy if exists "business media owner uploads" on storage.objects;
create policy "business media owner uploads" on storage.objects for insert to authenticated with check (
  bucket_id = 'business-media' and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[2]
      and b.owner_id = auth.jwt() ->> 'sub' and b.status in ('draft', 'pending', 'rejected')
  )
);

create or replace function public.business_prepare_photo(p_business_id uuid, p_extension text)
returns text language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'sub'; v_ext text := lower(trim(p_extension));
begin
  if v_actor is null then raise exception 'UNAUTHORIZED'; end if;
  if v_ext not in ('jpg', 'jpeg', 'png', 'webp') then raise exception 'INVALID_IMAGE_TYPE'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id and owner_id = v_actor and status in ('draft', 'pending', 'rejected')) then
    raise exception 'BUSINESS_PHOTO_NOT_ALLOWED';
  end if;
  return v_actor || '/' || p_business_id::text || '/';
end; $$;
revoke all on function public.business_prepare_photo(uuid, text) from public;
grant execute on function public.business_prepare_photo(uuid, text) to authenticated;

-- Reports must reference a real visible target, cannot be aimed at oneself,
-- and are throttled even if a caller bypasses the app UI.
create unique index if not exists business_reports_open_business_unique
  on public.business_reports (reporter_id, business_id, reason) where resolved_at is null and business_id is not null;
create unique index if not exists business_reports_open_review_unique
  on public.business_reports (reporter_id, review_id, reason) where resolved_at is null and review_id is not null;
create or replace function public.business_validate_report() returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'sub'; v_target_owner text;
begin
  if v_actor is null or new.reporter_id <> v_actor then raise exception 'UNAUTHORIZED'; end if;
  if (select count(*) from public.business_reports where reporter_id = v_actor and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'REPORT_RATE_LIMITED';
  end if;
  if new.business_id is not null then
    select owner_id into v_target_owner from public.businesses where id = new.business_id and status = 'approved';
  else
    select b.owner_id into v_target_owner from public.business_reviews r join public.businesses b on b.id = r.business_id where r.id = new.review_id and r.is_approved and b.status = 'approved';
  end if;
  if v_target_owner is null then raise exception 'REPORT_TARGET_NOT_FOUND'; end if;
  if v_target_owner = v_actor then raise exception 'BUSINESS_SELF_REPORT_FORBIDDEN'; end if;
  return new;
end; $$;
drop trigger if exists business_reports_validate on public.business_reports;
create trigger business_reports_validate before insert on public.business_reports for each row execute function public.business_validate_report();

create or replace function public.business_is_admin() returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(auth.jwt() ->> 'sub', '') <> '' and exists (
    select 1 from public.business_admins where user_id = auth.jwt() ->> 'sub'
  );
$$;
revoke all on function public.business_is_admin() from public;
grant execute on function public.business_is_admin() to authenticated;

-- Re-declare moderation with explicit state transitions; an admin cannot
-- approve arbitrary drafts/suspended listings or resolve an already closed report.
create or replace function public.business_admin_moderate(p_target_type public.business_moderation_target, p_target_id uuid, p_action text, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'sub'; v_business public.businesses%rowtype;
begin
  if v_actor is null or not public.business_is_admin() then raise exception 'BUSINESS_ADMIN_REQUIRED'; end if;
  if p_target_type = 'business' then
    select * into v_business from public.businesses where id = p_target_id for update;
    if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;
    if p_action = 'approve' and v_business.status = 'pending' then
      if v_business.owner_id = v_actor then raise exception 'BUSINESS_SELF_APPROVAL_FORBIDDEN'; end if;
      update public.businesses set status='approved', approved_at=now(), approved_by=v_actor, rejection_reason=null, updated_at=now() where id=p_target_id;
    elsif p_action = 'reject' and v_business.status = 'pending' then
      update public.businesses set status='rejected', rejection_reason=left(coalesce(p_reason, ''), 1000), updated_at=now() where id=p_target_id;
    elsif p_action = 'suspend' and v_business.status = 'approved' then
      update public.businesses set status='suspended', updated_at=now() where id=p_target_id;
    else raise exception 'BUSINESS_INVALID_TRANSITION'; end if;
  elsif p_target_type = 'review' and p_action in ('hide', 'restore') then
    update public.business_reviews set is_approved=(p_action = 'restore'), updated_at=now() where id=p_target_id and is_approved is distinct from (p_action = 'restore');
    if not found then raise exception 'BUSINESS_INVALID_TRANSITION'; end if;
  elsif p_target_type = 'report' and p_action = 'resolve' then
    update public.business_reports set resolved_at=now(), resolved_by=v_actor where id=p_target_id and resolved_at is null;
    if not found then raise exception 'BUSINESS_INVALID_TRANSITION'; end if;
  else raise exception 'BUSINESS_INVALID_ACTION'; end if;
  insert into public.moderation_actions (admin_id,target_type,target_id,action,reason) values (v_actor,p_target_type,p_target_id,p_action,left(p_reason,2000));
end; $$;
revoke all on function public.business_admin_moderate(public.business_moderation_target, uuid, text, text) from public;
grant execute on function public.business_admin_moderate(public.business_moderation_target, uuid, text, text) to authenticated;

-- Return object paths before cascading rows disappear.  The client must
-- delete every returned private object and only then delete its Clerk user.
drop function if exists public.business_delete_user_data();
create or replace function public.business_delete_user_data() returns text[] language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'sub'; v_paths text[];
begin
  if v_actor is null then raise exception 'UNAUTHORIZED'; end if;
  select coalesce(array_agg(p.storage_path), '{}'::text[]) into v_paths
    from public.business_photos p join public.businesses b on b.id = p.business_id
    where b.owner_id = v_actor;
  delete from public.businesses where owner_id = v_actor;
  delete from public.business_favorites where user_id = v_actor;
  delete from public.business_reviews where user_id = v_actor;
  delete from public.business_reports where reporter_id = v_actor;
  delete from public.business_blocks where user_id = v_actor;
  delete from public.business_admins where user_id = v_actor;
  return v_paths;
end; $$;
revoke all on function public.business_delete_user_data() from public;
grant execute on function public.business_delete_user_data() to authenticated;

commit;