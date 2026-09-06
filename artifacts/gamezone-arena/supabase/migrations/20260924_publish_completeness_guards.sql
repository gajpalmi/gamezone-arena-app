-- Draft rows remain private and editable. Submission is the trust boundary:
-- every public/moderated record must be complete before entering the queue.

create or replace function public.business_submit(p_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.businesses%rowtype;
  actor text := auth.jwt() ->> 'sub';
begin
  select * into v from public.businesses where id = p_business_id for update;
  if actor is null or not found or v.owner_id <> actor then
    raise exception 'BUSINESS_NOT_OWNER';
  end if;
  if v.status not in ('draft', 'rejected', 'pending')
     or v.category_id is null
     or char_length(trim(v.name)) < 2
     or char_length(trim(coalesce(v.city, ''))) < 2
     or v.phone is null
     or v.public_contact_consent_at is null
     or v.terms_accepted_at is null
     or v.privacy_accepted_at is null
     or v.listing_rules_accepted_at is null then
    raise exception 'BUSINESS_INCOMPLETE';
  end if;
  update public.businesses
  set status = 'pending', submitted_at = now(), rejection_reason = null, updated_at = now()
  where id = p_business_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.business_offering_submit(p_offering_id uuid)
returns public.business_offerings
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.business_offerings%rowtype;
  actor text := auth.jwt() ->> 'sub';
begin
  select * into v from public.business_offerings where id = p_offering_id for update;
  if actor is null or not found or v.owner_user_id <> actor then
    raise exception 'OFFERING_NOT_OWNER';
  end if;
  if v.status not in ('draft', 'rejected')
     or char_length(trim(v.name)) < 2
     or char_length(trim(v.category)) < 2
     or char_length(trim(coalesce(v.subcategory, ''))) < 2
     or char_length(trim(v.description)) < 2
     or char_length(trim(v.city)) < 2
     or v.contact_phone is null
     or v.contact_public_consent_at is null
     or v.terms_accepted_at is null then
    raise exception 'OFFERING_INCOMPLETE';
  end if;
  update public.business_offerings
  set status = 'pending', submitted_at = now(), rejection_reason = null, updated_at = now()
  where id = p_offering_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.job_submit(p_job_id uuid)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.jobs%rowtype;
  actor text := auth.jwt() ->> 'sub';
begin
  select * into v from public.jobs where id = p_job_id for update;
  if actor is null or not found or v.employer_id <> actor then
    raise exception 'JOB_NOT_OWNER';
  end if;
  if v.status not in ('draft', 'rejected')
     or v.category_id is null
     or char_length(trim(v.title)) < 2
     or char_length(trim(v.company_name)) < 2
     or char_length(trim(v.employer_name)) < 2
     or char_length(trim(coalesce(v.job_role, ''))) < 2
     or char_length(trim(v.description)) < 20
     or cardinality(v.required_skills) = 0
     or v.required_experience_months is null
     or char_length(trim(coalesce(v.education_requirement, ''))) < 2
     or v.salary_min is null
     or v.salary_max is null
     or char_length(trim(v.city)) < 2
     or char_length(trim(coalesce(v.area, ''))) < 2
     or char_length(trim(coalesce(v.location_text, ''))) < 2
     or char_length(trim(coalesce(v.working_hours, ''))) < 2
     or char_length(trim(coalesce(v.benefits, ''))) < 2
     or char_length(trim(coalesce(v.requirements, ''))) < 2
     or v.application_deadline is null
     or v.terms_accepted_at is null
     or v.privacy_accepted_at is null
     or v.rules_accepted_at is null then
    raise exception 'JOB_INCOMPLETE';
  end if;
  update public.jobs
  set status = 'pending', submitted_at = now(), rejection_reason = null, updated_at = now()
  where id = p_job_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.job_submit_seeker_profile(p_profile_id uuid)
returns public.job_seeker_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.job_seeker_profiles%rowtype;
  actor text := auth.jwt() ->> 'sub';
begin
  select * into v from public.job_seeker_profiles where id = p_profile_id for update;
  if actor is null or not found or v.user_id <> actor then
    raise exception 'PROFILE_NOT_OWNER';
  end if;
  if v.status not in ('draft', 'rejected')
     or char_length(trim(v.display_name)) < 2
     or v.category_id is null
     or char_length(trim(coalesce(v.job_role, ''))) < 2
     or cardinality(v.skills) = 0
     or v.experience_months is null
     or char_length(trim(coalesce(v.city, ''))) < 2
     or char_length(trim(v.bio)) < 2
     or not v.is_public
     or v.terms_accepted_at is null
     or v.privacy_accepted_at is null then
    raise exception 'PROFILE_INCOMPLETE';
  end if;
  update public.job_seeker_profiles
  set status = 'pending', submitted_at = now(), rejection_reason = null, updated_at = now()
  where id = p_profile_id
  returning * into v;
  return v;
end;
$$;

revoke all on function public.business_submit(uuid),
  public.business_offering_submit(uuid),
  public.job_submit(uuid),
  public.job_submit_seeker_profile(uuid)
from public, anon;

grant execute on function public.business_submit(uuid),
  public.business_offering_submit(uuid),
  public.job_submit(uuid),
  public.job_submit_seeker_profile(uuid)
to authenticated;