-- Additive owner-only contact readers for edit-form hydration.
-- These functions intentionally expose private contacts only to the JWT subject
-- that owns the associated job or seeker profile.
begin;

create function public.job_get_owner_contact(p_job_id uuid)
returns table(
  phone text,
  whatsapp text,
  email text,
  website text,
  phone_public boolean,
  whatsapp_public boolean,
  email_public boolean
)
language sql
security definer
set search_path=public,pg_temp
as $$
  select
    c.phone,
    c.whatsapp,
    c.email,
    c.website,
    c.phone_consent_at is not null,
    c.whatsapp_consent_at is not null,
    c.email_consent_at is not null
  from public.job_contacts c
  join public.jobs j on j.id=c.job_id
  where nullif(btrim(auth.jwt()->>'sub'),'') is not null
    and j.id=p_job_id
    and j.employer_id=nullif(btrim(auth.jwt()->>'sub'),'')
$$;

create function public.job_get_my_seeker_contact()
returns table(
  phone text,
  whatsapp text,
  email text,
  phone_public boolean,
  whatsapp_public boolean,
  email_public boolean
)
language sql
security definer
set search_path=public,pg_temp
as $$
  select
    c.phone,
    c.whatsapp,
    c.email,
    c.phone_consent_at is not null,
    c.whatsapp_consent_at is not null,
    c.email_consent_at is not null
  from public.job_seeker_contacts c
  join public.job_seeker_profiles p on p.id=c.profile_id
  where nullif(btrim(auth.jwt()->>'sub'),'') is not null
    and p.user_id=nullif(btrim(auth.jwt()->>'sub'),'')
$$;

revoke all on function public.job_get_owner_contact(uuid),public.job_get_my_seeker_contact() from public;
grant execute on function public.job_get_owner_contact(uuid),public.job_get_my_seeker_contact() to anon,authenticated;

commit;