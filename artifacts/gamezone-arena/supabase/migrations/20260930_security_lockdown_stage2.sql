-- STAGE 2 — APPLY ONLY AFTER FRONTEND MIGRATION.
-- Prerequisite: clients must use Stage 1 projections/RPCs. This CANNOT be applied
-- until every raw business/offering browse/detail, owner edit/list, embedded
-- favorites relation, embedded basket relation, job application my/list/detail,
-- worker-contact, moderation, and mutation RETURNING call is migrated. No data or
-- authentication changes.
--
-- OBJECT | CURRENT ACCESS | PROBLEM | NEW ACCESS | REASON
-- businesses | raw browse/detail/owner/favorite embeds/RETURNING | contacts/owner/legal leak | public/owner/admin views | column security
-- business_offerings | raw browse/detail/owner/basket/favorite embeds/RETURNING | contact/owner leak | public/owner/admin views | column security
-- job_applications | raw my/employer/detail/moderation/RETURNING | phone/email leak | sanitized detail/list/my RPCs | contact minimization
-- job_seeker_contacts | owner raw SELECT | bypassable contact surface | authorized RPC only | application-bound disclosure
-- new public views | Stage 1 grants | safe selected columns | same | discovery without private fields
-- new RPCs | authenticated EXECUTE | explicit checks | same | authorized minimal disclosure
-- old worker RPC | authenticated EXECUTE | profile-ID authorization | revoked/fail closed | prevent enumeration
--
-- Rollback: restore only the specific SELECT grants after confirming the prior
-- RLS policies are still appropriate; revoke Stage 1 view/RPC grants if reverting
-- the frontend. Do not restore job_get_seeker_contact's unsafe implementation.

begin;

revoke select on public.businesses, public.business_offerings, public.job_applications,
  public.job_seeker_contacts from public, anon, authenticated;

-- Views/functions retain the explicit grants made in Stage 1; repeat them so this
-- migration is self-documenting if role defaults are changed between stages.
grant select on public.business_public_projection, public.business_offering_public_projection to anon, authenticated;
grant select on public.business_owner_projection, public.business_offering_owner_projection,
  public.business_admin_moderation_projection, public.business_offering_admin_moderation_projection to authenticated;
grant execute on function public.business_get_public_contact(uuid),
  public.business_offering_get_public_contact(uuid),
  public.job_get_authorized_worker_contact(uuid),
  public.job_get_sanitized_application(uuid),
  public.job_list_sanitized_applications(uuid),
  public.job_list_my_sanitized_applications(),
  public.job_get_employer_contact(uuid) to authenticated;

-- Preserve seeker-photo reads. Resume files are deliberately not directly
-- readable by employers: a future application-bound signed-URL/RPC must enforce
-- eligible application status and job block checks before a frontend exposes one.
drop policy if exists "job private media authorized reads" on storage.objects;
create policy "job private media authorized reads"
on storage.objects for select to authenticated
using (
  (bucket_id = 'job-private-media'
   and (storage.foldername(name))[1] = 'job-seekers'
   and exists (
     select 1 from public.job_seeker_profiles p
     where p.id::text = (storage.foldername(name))[3]
       and (p.user_id = auth.jwt() ->> 'sub'
            or (p.is_public and p.status = 'active'
                and not public.job_is_blocked(auth.jwt() ->> 'sub', p.user_id))
            or public.business_is_admin())
   ))
  or
  (bucket_id = 'job-private-media'
   and (storage.foldername(name))[1] = 'job-resumes'
   and exists (
     select 1 from public.job_applications a
     where a.id::text = (storage.foldername(name))[3]
       and (a.applicant_id = auth.jwt() ->> 'sub' or public.business_is_admin())
   ))
);

-- Keep the exact historical signature in place to avoid dependency failures, but
-- make every invocation return zero rows. No DROP CASCADE and no unsafe fallback.
create or replace function public.job_get_seeker_contact(p_profile_id uuid)
returns table(phone text, whatsapp text, email text)
language sql stable security definer set search_path = public as $$
  select null::text, null::text, null::text where false;
$$;
revoke all on function public.job_get_seeker_contact(uuid) from public, anon, authenticated;

commit;