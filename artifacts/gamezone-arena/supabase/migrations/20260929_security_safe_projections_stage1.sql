-- STAGE 1 (ADDITIVE): deploy before the frontend changes and before Stage 2.
-- This migration intentionally does not revoke existing table SELECT or RPC access.
-- SECURITY DEFINER functions below use only schema-qualified objects and no dynamic SQL.

begin;

-- Public discovery deliberately excludes contact, owner, legal, and moderation fields.
-- Default definer-view semantics are intentional: these actor predicates are the
-- security boundary, so do not change the views to SECURITY INVOKER during rollout.
create or replace view public.business_public_projection
with (security_barrier = true) as
  select b.id, b.category_id, b.name, b.description, b.city, b.latitude, b.longitude,
         b.subcategory, b.service_areas, b.services_offered, b.price_range, b.status,
         b.approved_at, b.created_at, b.updated_at
  from public.businesses b
  where b.status = 'approved'
    and not exists (
      select 1 from public.business_blocks x
      where x.business_id = b.id and x.user_id = auth.jwt() ->> 'sub'
    );

create or replace view public.business_offering_public_projection
with (security_barrier = true) as
  select o.id, o.business_id, o.kind, o.listing_intent, o.name, o.category,
         o.subcategory, o.description, o.price, o.price_unit, o.in_stock, o.city,
         o.area, o.location_text, o.service_area, o.delivery_info, o.availability_hours,
         o.is_enabled, o.status, o.created_at, o.updated_at
  from public.business_offerings o
  where o.status = 'approved' and o.is_enabled
    and not exists (
      select 1 from public.business_offering_blocks x
      where x.offering_id = o.id and x.user_id = auth.jwt() ->> 'sub'
    )
    and not exists (
      select 1 from public.business_blocks b
      where b.business_id = o.business_id and b.user_id = auth.jwt() ->> 'sub'
    );

-- Replacements for owner edit screens and the existing admin moderation lists.
-- They are intentionally actor-filtered rather than relying on view ownership/RLS.
create or replace view public.business_owner_projection
with (security_barrier = true) as
  select b.*
  from public.businesses b
  where b.owner_id = (auth.jwt() ->> 'sub');

create or replace view public.business_offering_owner_projection
with (security_barrier = true) as
  select o.*
  from public.business_offerings o
  where o.owner_user_id = (auth.jwt() ->> 'sub');

create or replace view public.business_admin_moderation_projection
with (security_barrier = true) as
  select b.id, b.category_id, b.name, b.description, b.city, b.status, b.submitted_at,
         b.approved_at, b.rejection_reason, b.created_at, b.updated_at
  from public.businesses b
  where public.business_is_admin();

create or replace view public.business_offering_admin_moderation_projection
with (security_barrier = true) as
  select o.id, o.business_id, o.kind, o.listing_intent, o.name, o.category, o.subcategory,
         o.description, o.city, o.is_enabled, o.status, o.submitted_at, o.approved_at,
         o.rejection_reason, o.created_at, o.updated_at
  from public.business_offerings o
  where public.business_is_admin();

create or replace function public.business_get_public_contact(p_business_id uuid)
returns table(listing_id uuid, contact_type text, contact_value text, display_name text)
language sql stable security definer set search_path = public as $$
  select b.id, v.contact_type, v.contact_value, b.name
  from public.businesses b
  cross join lateral (values
    ('phone'::text, b.phone),
    ('whatsapp'::text, b.whatsapp),
    ('email'::text, b.email)
  ) v(contact_type, contact_value)
  where auth.jwt() ->> 'sub' is not null
    and b.id = p_business_id and b.status = 'approved'
    and b.public_contact_consent_at is not null
    and not exists (
      select 1 from public.business_blocks x
      where x.business_id = b.id and x.user_id = auth.jwt() ->> 'sub'
    )
    and v.contact_value is not null
    and ((v.contact_type in ('phone', 'whatsapp') and btrim(v.contact_value) = v.contact_value
          and v.contact_value ~ '^\+?[0-9][0-9 ()-]{6,38}$')
      or (v.contact_type = 'email' and btrim(v.contact_value) = v.contact_value
          and char_length(v.contact_value) <= 254
          and v.contact_value ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,63}$'));
$$;

create or replace function public.business_offering_get_public_contact(p_offering_id uuid)
returns table(listing_id uuid, contact_type text, contact_value text)
language sql stable security definer set search_path = public as $$
  select o.id, v.contact_type, v.contact_value
  from public.business_offerings o
  cross join lateral (values ('phone'::text, o.contact_phone), ('whatsapp'::text, o.whatsapp))
    v(contact_type, contact_value)
  where auth.jwt() ->> 'sub' is not null
    and o.id = p_offering_id and o.status = 'approved' and o.is_enabled
    and o.contact_public_consent_at is not null
    and not exists (
      select 1 from public.business_offering_blocks x
      where x.offering_id = o.id and x.user_id = auth.jwt() ->> 'sub'
    )
    and not exists (
      select 1 from public.business_blocks b
      where b.business_id = o.business_id and b.user_id = auth.jwt() ->> 'sub'
    )
    and v.contact_value is not null and btrim(v.contact_value) = v.contact_value
    and v.contact_value ~ '^\+?[0-9][0-9 ()-]{6,38}$';
$$;

create or replace function public.job_get_authorized_worker_contact(p_application_id uuid)
returns table(phone text, whatsapp text, email text)
language sql stable security definer set search_path = public as $$
  select
    case when c.phone_consent_at is not null and btrim(c.phone) = c.phone and c.phone ~ '^\+?[0-9][0-9 ()-]{6,38}$' then c.phone end,
    case when c.whatsapp_consent_at is not null and btrim(c.whatsapp) = c.whatsapp and c.whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$' then c.whatsapp end,
    case when c.email_consent_at is not null and c.email is not null and btrim(c.email) = c.email and char_length(c.email) <= 254 and c.email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,63}$' then c.email end
  from public.job_applications a
  join public.jobs j on j.id = a.job_id
  join public.job_seeker_profiles p on p.user_id = a.applicant_id
  join public.job_seeker_contacts c on c.profile_id = p.id
  where auth.jwt() ->> 'sub' is not null
    and a.id = p_application_id
    and j.employer_id = auth.jwt() ->> 'sub'
    and j.status = 'active'
    and a.status in ('shortlisted', 'contacted', 'interview', 'selected')
    and p.status = 'active'
    and not public.job_is_blocked(j.employer_id, p.user_id)
    and (c.phone_consent_at is not null or c.whatsapp_consent_at is not null or c.email_consent_at is not null)
    and ((c.phone_consent_at is not null and btrim(c.phone) = c.phone and c.phone ~ '^\+?[0-9][0-9 ()-]{6,38}$')
      or (c.whatsapp_consent_at is not null and btrim(c.whatsapp) = c.whatsapp and c.whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$')
      or (c.email_consent_at is not null and c.email is not null and btrim(c.email) = c.email and char_length(c.email) <= 254 and c.email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,63}$'));
$$;

-- Neither applicants nor employers need raw phone/email to render an application.
create or replace function public.job_get_sanitized_application(p_application_id uuid)
returns table(application_id uuid, job_id uuid, applicant_name text, experience_months integer,
              skills text[], introduction text, message text,
              status public.job_application_status, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.job_id, a.applicant_name, a.experience_months, a.skills, a.introduction, a.message,
         a.status, a.created_at, a.updated_at
  from public.job_applications a join public.jobs j on j.id = a.job_id
  where auth.jwt() ->> 'sub' is not null and a.id = p_application_id
    and (a.applicant_id = auth.jwt() ->> 'sub' or j.employer_id = auth.jwt() ->> 'sub'
         or public.business_is_admin());
$$;

create or replace function public.job_list_sanitized_applications(p_job_id uuid)
returns table(application_id uuid, job_id uuid, applicant_name text, experience_months integer,
              skills text[], introduction text, message text,
              status public.job_application_status, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.job_id, a.applicant_name, a.experience_months, a.skills, a.introduction, a.message,
         a.status, a.created_at, a.updated_at
  from public.job_applications a join public.jobs j on j.id = a.job_id
  where auth.jwt() ->> 'sub' is not null and a.job_id = p_job_id
    and (j.employer_id = auth.jwt() ->> 'sub' or public.business_is_admin()
         or a.applicant_id = auth.jwt() ->> 'sub');
$$;

create or replace function public.job_list_my_sanitized_applications()
returns table(application_id uuid, job_id uuid, applicant_name text, experience_months integer,
              skills text[], introduction text, message text,
              status public.job_application_status, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.job_id, a.applicant_name, a.experience_months, a.skills, a.introduction, a.message,
         a.status, a.created_at, a.updated_at
  from public.job_applications a
  where auth.jwt() ->> 'sub' is not null and a.applicant_id = auth.jwt() ->> 'sub';
$$;

-- Preserve the existing signature and job_can_view authorization while applying
-- the same strict, individually-consented value checks used by the new RPCs.
create or replace function public.job_get_employer_contact(p_job_id uuid)
returns table(phone text, whatsapp text, email text, website text)
language sql stable security definer set search_path = public as $$
  select
    case when c.phone_consent_at is not null and btrim(c.phone) = c.phone and c.phone ~ '^\+?[0-9][0-9 ()-]{6,38}$' then c.phone end,
    case when c.whatsapp_consent_at is not null and btrim(c.whatsapp) = c.whatsapp and c.whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$' then c.whatsapp end,
    case when c.email_consent_at is not null and c.email is not null and btrim(c.email) = c.email and char_length(c.email) <= 254 and c.email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,63}$' then c.email end,
    case when c.website is not null and btrim(c.website) = c.website
              and char_length(c.website) <= 2048
              and c.website ~* '^https?://[^[:space:]]+$' then c.website end
  from public.job_contacts c join public.jobs j on j.id = c.job_id
  where c.job_id = p_job_id and public.job_can_view(j.id);
$$;

revoke all on function public.business_get_public_contact(uuid),
  public.business_offering_get_public_contact(uuid),
  public.job_get_authorized_worker_contact(uuid),
  public.job_get_sanitized_application(uuid),
  public.job_list_sanitized_applications(uuid),
  public.job_list_my_sanitized_applications(),
  public.job_get_employer_contact(uuid) from public, anon;
grant execute on function public.business_get_public_contact(uuid),
  public.business_offering_get_public_contact(uuid),
  public.job_get_authorized_worker_contact(uuid),
  public.job_get_sanitized_application(uuid),
  public.job_list_sanitized_applications(uuid),
  public.job_list_my_sanitized_applications(),
  public.job_get_employer_contact(uuid) to authenticated;

revoke all on public.business_public_projection, public.business_offering_public_projection,
  public.business_owner_projection, public.business_offering_owner_projection,
  public.business_admin_moderation_projection, public.business_offering_admin_moderation_projection from public;
grant select on public.business_public_projection, public.business_offering_public_projection to anon, authenticated;
grant select on public.business_owner_projection, public.business_offering_owner_projection,
  public.business_admin_moderation_projection, public.business_offering_admin_moderation_projection to authenticated;

commit;