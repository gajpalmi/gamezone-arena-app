-- NOT RUN — NEVER RUN AGAINST PRODUCTION.
-- LOCAL, DISPOSABLE-DB psql harness only. It requires pre-seeded fixtures and
-- psql variables; it never uses service_role, production credentials, or secrets.
-- Required: business_id pending_business_id no_consent_business_id blocked_business_id
-- invalid_business_id offering_id blocked_offering_id parent_blocked_offering_id
-- application_id other_job_application_id
-- terminal_application_id job_id profile_id unrelated_sub blocker_sub employer_sub
-- wrong_employer_sub applicant_sub admin_sub former_employer_sub moderation_business_id
-- malformed_worker_application_id malformed_employer_job_id resume_application_id.
\if :{?business_id}
\else
\echo 'Missing required fixture variables; refusing to run.'
\quit
\endif
\if :{?admin_sub}
\else
\echo 'Missing admin_sub; refusing to run.'
\quit
\endif
\if :{?pending_business_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?no_consent_business_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?blocked_business_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?invalid_business_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?offering_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?blocked_offering_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?parent_blocked_offering_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?application_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?other_job_application_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?terminal_application_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?job_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?profile_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?unrelated_sub}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?blocker_sub}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?employer_sub}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?wrong_employer_sub}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?applicant_sub}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?former_employer_sub}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?moderation_business_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?malformed_worker_application_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?malformed_employer_job_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
\if :{?resume_application_id}
\else
\echo 'Missing fixture variables; refusing to run.'
\quit
\endif
select set_config('fixture.business_id', :'business_id', false), set_config('fixture.pending_business_id', :'pending_business_id', false), set_config('fixture.no_consent_business_id', :'no_consent_business_id', false), set_config('fixture.blocked_business_id', :'blocked_business_id', false), set_config('fixture.invalid_business_id', :'invalid_business_id', false), set_config('fixture.blocked_offering_id', :'blocked_offering_id', false), set_config('fixture.parent_blocked_offering_id', :'parent_blocked_offering_id', false), set_config('fixture.application_id', :'application_id', false), set_config('fixture.other_job_application_id', :'other_job_application_id', false), set_config('fixture.terminal_application_id', :'terminal_application_id', false), set_config('fixture.job_id', :'job_id', false), set_config('fixture.profile_id', :'profile_id', false), set_config('fixture.moderation_business_id', :'moderation_business_id', false), set_config('fixture.malformed_worker_application_id', :'malformed_worker_application_id', false), set_config('fixture.malformed_employer_job_id', :'malformed_employer_job_id', false), set_config('fixture.resume_application_id', :'resume_application_id', false);

-- 01 setup eligible business; caller anon; operation business contact; expected zero; property JWT required.
begin; set local role anon; select set_config('request.jwt.claims','{}',true);
do $$ begin if exists (select 1 from public.business_get_public_contact(current_setting('fixture.business_id')::uuid)) then raise exception 'case 01 failed'; end if; end $$; rollback;
-- 02 setup eligible unblocked business; caller unrelated authenticated; operation contact; expected minimal rows; property only consented fields.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'unrelated_sub','role','authenticated')::text,true);
do $$ begin if not exists (select 1 from public.business_get_public_contact(current_setting('fixture.business_id')::uuid)) then raise exception 'case 02 failed'; end if; end $$; rollback;
-- 03 setup pending business; caller authenticated; operation contact; expected zero; property approval required.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'unrelated_sub','role','authenticated')::text,true);
do $$ begin if exists (select 1 from public.business_get_public_contact(current_setting('fixture.pending_business_id')::uuid)) then raise exception 'case 03 failed'; end if; end $$; rollback;
-- 04 setup approved no-consent business; caller authenticated; operation contact; expected zero; property explicit consent.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'unrelated_sub','role','authenticated')::text,true);
do $$ begin if exists (select 1 from public.business_get_public_contact(current_setting('fixture.no_consent_business_id')::uuid)) then raise exception 'case 04 failed'; end if; end $$; rollback;
-- 05 setup invalid-contact fixture; caller authenticated; operation contact; expected zero; property malformed channel suppressed.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'unrelated_sub','role','authenticated')::text,true);
do $$ begin
  if exists (
    select 1 from public.business_get_public_contact(current_setting('fixture.invalid_business_id')::uuid)
    where contact_type = 'email'
  ) or not exists (
    select 1 from public.business_get_public_contact(current_setting('fixture.invalid_business_id')::uuid)
    where contact_type = 'phone'
  ) then
    raise exception 'case 05 failed';
  end if;
end $$; rollback;
-- 06 setup blocker row; caller blocker; operation business contact/projection; expected zero; property business block wins.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'blocker_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.business_get_public_contact(current_setting('fixture.blocked_business_id')::uuid)) or exists(select 1 from public.business_public_projection where id=current_setting('fixture.blocked_business_id')::uuid) then raise exception 'case 06 failed'; end if; end $$; rollback;
-- 07 setup former eligible profile; caller employer; operation old profile RPC; expected permission denied; property retirement.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin perform public.job_get_seeker_contact(current_setting('fixture.profile_id')::uuid); raise exception 'case 07 failed'; exception when insufficient_privilege then null; end $$; rollback;
-- 08 setup exact active employer/job/shortlisted application/consent; caller employer; operation new RPC; expected row; property application binding.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin if not exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.application_id')::uuid)) then raise exception 'case 08 failed'; end if; end $$; rollback;
-- 09 setup application on unowned job; caller other employer; operation new RPC; expected zero; property exact job owner.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'wrong_employer_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.other_job_application_id')::uuid)) then raise exception 'case 09 failed'; end if; end $$; rollback;
-- 10 setup mismatched worker/contact fixture; caller employer; operation new RPC; expected zero; property applicant-derived contact only.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.other_job_application_id')::uuid)) then raise exception 'case 10 failed'; end if; end $$; rollback;
-- 11 setup rejected/withdrawn application; caller employer; operation new RPC; expected zero; property terminal status excluded.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.terminal_application_id')::uuid)) then raise exception 'case 11 failed'; end if; end $$; rollback;
-- 12 setup protected rows; caller authenticated; operation raw SELECT on all four; expected denied; property raw bypass closed.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'unrelated_sub','role','authenticated')::text,true);
do $$ begin begin perform phone from public.businesses limit 1; raise exception 'businesses not denied'; exception when insufficient_privilege then end; begin perform contact_phone from public.business_offerings limit 1; raise exception 'offerings not denied'; exception when insufficient_privilege then end; begin perform phone from public.job_applications limit 1; raise exception 'applications not denied'; exception when insufficient_privilege then end; begin perform phone from public.job_seeker_contacts limit 1; raise exception 'contacts not denied'; exception when insufficient_privilege then end; end $$; rollback;
-- 13 setup admin-visible moderation fixture and another employer application; caller admin; operation view/new worker RPC; expected fixture row and zero contact; property no admin bypass.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'admin_sub','role','authenticated')::text,true);
do $$ begin if not exists(select 1 from public.business_admin_moderation_projection where id=current_setting('fixture.moderation_business_id')::uuid) or exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.application_id')::uuid)) then raise exception 'case 13 failed'; end if; end $$; rollback;
-- 14 setup eligible application; caller anon; operation worker RPC; expected zero; property JWT required.
begin; set local role anon; select set_config('request.jwt.claims','{}',true);
do $$ begin if exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.application_id')::uuid)) then raise exception 'case 14 failed'; end if; end $$; rollback;
-- 15 setup account-change/reused-ID fixture in disposable DB; caller former employer; operation worker RPC; expected zero; property current chain revalidated.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'former_employer_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.application_id')::uuid)) then raise exception 'case 15 failed'; end if; end $$; rollback;

-- Additional projection/contact and sanitized-read assertions.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'blocker_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.business_offering_public_projection where id=current_setting('fixture.blocked_offering_id')::uuid) or exists(select 1 from public.business_offering_get_public_contact(current_setting('fixture.blocked_offering_id')::uuid)) then raise exception 'offering block failed'; end if; end $$; rollback;
-- Parent-business block is a separate offering visibility/contact branch.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'blocker_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.business_offering_public_projection where id=current_setting('fixture.parent_blocked_offering_id')::uuid) or exists(select 1 from public.business_offering_get_public_contact(current_setting('fixture.parent_blocked_offering_id')::uuid)) then raise exception 'parent business offering block failed'; end if; end $$; rollback;
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin perform application_id,job_id,applicant_name,experience_months,skills,introduction,message,status,created_at,updated_at from public.job_get_sanitized_application(current_setting('fixture.application_id')::uuid); perform application_id from public.job_list_sanitized_applications(current_setting('fixture.job_id')::uuid); end $$; rollback;
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'applicant_sub','role','authenticated')::text,true);
do $$ begin if not exists(select 1 from public.job_list_my_sanitized_applications()) then raise exception 'my sanitized list failed'; end if; end $$; rollback;
-- Malformed worker values must not be disclosed by the application-bound RPC.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.job_get_authorized_worker_contact(current_setting('fixture.malformed_worker_application_id')::uuid)) then raise exception 'malformed worker contact disclosed'; end if; end $$; rollback;
-- Malformed employer phone/WhatsApp/email/website are returned only as NULL.
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'unrelated_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from public.job_get_employer_contact(current_setting('fixture.malformed_employer_job_id')::uuid) x where x.phone is not null or x.whatsapp is not null or x.email is not null or x.website is not null) then raise exception 'malformed employer contact disclosed'; end if; end $$; rollback;
-- Resume storage fixture path must be `job-resumes/<applicant-sub>/<application-id>/...`.
-- Applicant owner is allowed; an unrelated job employer is denied; verified admin
-- remains allowed by the existing admin policy (documented intentional moderation access).
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'applicant_sub','role','authenticated')::text,true);
do $$ begin if not exists(select 1 from storage.objects where bucket_id='job-private-media' and name like '%/' || current_setting('fixture.resume_application_id') || '/%') then raise exception 'applicant resume read missing'; end if; end $$; rollback;
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'employer_sub','role','authenticated')::text,true);
do $$ begin if exists(select 1 from storage.objects where bucket_id='job-private-media' and name like '%/' || current_setting('fixture.resume_application_id') || '/%') then raise exception 'employer resume read not denied'; end if; end $$; rollback;
begin; set local role authenticated; select set_config('request.jwt.claims',json_build_object('sub',:'admin_sub','role','authenticated')::text,true);
do $$ begin if not exists(select 1 from storage.objects where bucket_id='job-private-media' and name like '%/' || current_setting('fixture.resume_application_id') || '/%') then raise exception 'admin resume moderation read missing'; end if; end $$; rollback;