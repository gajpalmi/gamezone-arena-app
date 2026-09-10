-- Clerk JWTs carry a valid sub even when PostgREST uses the anon database role.
-- These additive RPCs retain actor checks and deliberately expose only the
-- columns used by the jobs client.
-- After this stage, the current client must use these RPCs for job/profile
-- saves, applications, reports, settings, saves, blocks, and owner lists;
-- it must not perform the corresponding raw-table mutations as anon.
begin;

create function public.job_save_draft(p_input jsonb, p_job_id uuid default null, p_contact jsonb default '{}'::jsonb)
returns public.jobs language plpgsql security definer set search_path=public,pg_temp as $$
declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); v public.jobs%rowtype; bid uuid;
begin
   if a is null then raise exception 'UNAUTHORIZED'; end if;
   if p_input is null or jsonb_typeof(p_input) <> 'object'
      or p_contact is null or jsonb_typeof(p_contact) <> 'object' then
     raise exception 'INVALID_INPUT';
   end if;
  if p_input ? 'business_id' and nullif(p_input->>'business_id','') is not null then
    bid:=(p_input->>'business_id')::uuid;
    if not exists(select 1 from public.businesses b where b.id=bid and b.owner_id=a) then raise exception 'BUSINESS_NOT_OWNER'; end if;
  end if;
  if p_job_id is not null then
    select * into v from public.jobs where id=p_job_id for update;
    if not found or v.employer_id<>a or v.status not in ('draft','rejected') then raise exception 'JOB_NOT_EDITABLE'; end if;
    update public.jobs set
      business_id=case when p_input ? 'business_id' then bid else v.business_id end,
      category_id=case when p_input ? 'category_id' then nullif(p_input->>'category_id','')::uuid else v.category_id end,
      title=case when p_input ? 'title' then p_input->>'title' else v.title end,
      company_name=case when p_input ? 'company_name' then p_input->>'company_name' else v.company_name end,
      employer_name=case when p_input ? 'employer_name' then p_input->>'employer_name' else v.employer_name end,
      job_role=case when p_input ? 'job_role' then p_input->>'job_role' else v.job_role end,
      description=case when p_input ? 'description' then p_input->>'description' else v.description end,
      responsibilities=case when p_input ? 'responsibilities' then p_input->>'responsibilities' else v.responsibilities end,
      required_skills=case when p_input ? 'required_skills' then array(select jsonb_array_elements_text(p_input->'required_skills')) else v.required_skills end,
      required_experience_months=case when p_input ? 'required_experience_months' then nullif(p_input->>'required_experience_months','')::integer else v.required_experience_months end,
      education_requirement=case when p_input ? 'education_requirement' then p_input->>'education_requirement' else v.education_requirement end,
      vacancies=case when p_input ? 'vacancies' then (p_input->>'vacancies')::integer else v.vacancies end,
      salary_min=case when p_input ? 'salary_min' then nullif(p_input->>'salary_min','')::numeric else v.salary_min end,
      salary_max=case when p_input ? 'salary_max' then nullif(p_input->>'salary_max','')::numeric else v.salary_max end,
      salary_type=case when p_input ? 'salary_type' then (p_input->>'salary_type')::public.job_salary_type else v.salary_type end,
      work_type=case when p_input ? 'work_type' then (p_input->>'work_type')::public.job_work_type else v.work_type end,
      workplace_type=case when p_input ? 'workplace_type' then (p_input->>'workplace_type')::public.job_workplace_type else v.workplace_type end,
      location_text=case when p_input ? 'location_text' then p_input->>'location_text' else v.location_text end,
      city=case when p_input ? 'city' then p_input->>'city' else v.city end,
      area=case when p_input ? 'area' then p_input->>'area' else v.area end,
      working_hours=case when p_input ? 'working_hours' then p_input->>'working_hours' else v.working_hours end,
      weekly_off=case when p_input ? 'weekly_off' then p_input->>'weekly_off' else v.weekly_off end,
      benefits=case when p_input ? 'benefits' then p_input->>'benefits' else v.benefits end,
      requirements=case when p_input ? 'requirements' then p_input->>'requirements' else v.requirements end,
      joining_date=case when p_input ? 'joining_date' then nullif(p_input->>'joining_date','')::date else v.joining_date end,
      application_deadline=case when p_input ? 'application_deadline' then nullif(p_input->>'application_deadline','')::date else v.application_deadline end,
      terms_version=case when p_input ? 'terms_version' then p_input->>'terms_version' else v.terms_version end,
      terms_accepted_at=case when p_input ? 'terms_accepted_at' then nullif(p_input->>'terms_accepted_at','')::timestamptz else v.terms_accepted_at end,
      privacy_version=case when p_input ? 'privacy_version' then p_input->>'privacy_version' else v.privacy_version end,
      privacy_accepted_at=case when p_input ? 'privacy_accepted_at' then nullif(p_input->>'privacy_accepted_at','')::timestamptz else v.privacy_accepted_at end,
      rules_version=case when p_input ? 'rules_version' then p_input->>'rules_version' else v.rules_version end,
      rules_accepted_at=case when p_input ? 'rules_accepted_at' then nullif(p_input->>'rules_accepted_at','')::timestamptz else v.rules_accepted_at end,
      employer_id=a,status=v.status,updated_at=now()
    where id=p_job_id returning * into v;
  else
    insert into public.jobs(employer_id,business_id,category_id,title,company_name,employer_name,job_role,description,responsibilities,required_skills,required_experience_months,education_requirement,vacancies,salary_min,salary_max,salary_type,work_type,workplace_type,location_text,city,area,working_hours,weekly_off,benefits,requirements,joining_date,application_deadline,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at,rules_version,rules_accepted_at,status)
    values(a,bid,nullif(p_input->>'category_id','')::uuid,p_input->>'title',p_input->>'company_name',p_input->>'employer_name',p_input->>'job_role',p_input->>'description',p_input->>'responsibilities',coalesce(array(select jsonb_array_elements_text(p_input->'required_skills')),'{}'),nullif(p_input->>'required_experience_months','')::integer,p_input->>'education_requirement',coalesce((p_input->>'vacancies')::integer,1),nullif(p_input->>'salary_min','')::numeric,nullif(p_input->>'salary_max','')::numeric,coalesce((p_input->>'salary_type')::public.job_salary_type,'negotiable'),(p_input->>'work_type')::public.job_work_type,(p_input->>'workplace_type')::public.job_workplace_type,p_input->>'location_text',p_input->>'city',p_input->>'area',p_input->>'working_hours',p_input->>'weekly_off',p_input->>'benefits',p_input->>'requirements',nullif(p_input->>'joining_date','')::date,nullif(p_input->>'application_deadline','')::date,p_input->>'terms_version',nullif(p_input->>'terms_accepted_at','')::timestamptz,p_input->>'privacy_version',nullif(p_input->>'privacy_accepted_at','')::timestamptz,p_input->>'rules_version',nullif(p_input->>'rules_accepted_at','')::timestamptz,'draft') returning * into v;
  end if;
  insert into public.job_contacts(job_id,phone,whatsapp,email,website,phone_consent_at,whatsapp_consent_at,email_consent_at) values(v.id,p_contact->>'phone',p_contact->>'whatsapp',p_contact->>'email',p_contact->>'website',case when coalesce((p_contact->>'phone_public')::boolean,false) then now() end,case when coalesce((p_contact->>'whatsapp_public')::boolean,false) then now() end,case when coalesce((p_contact->>'email_public')::boolean,false) then now() end)
    on conflict(job_id) do update set phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,website=excluded.website,phone_consent_at=excluded.phone_consent_at,whatsapp_consent_at=excluded.whatsapp_consent_at,email_consent_at=excluded.email_consent_at,updated_at=now();
  return v;
end $$;

create function public.job_save_seeker_profile(p_input jsonb,p_contact jsonb default '{}'::jsonb)
returns public.job_seeker_profiles language plpgsql security definer set search_path=public,pg_temp as $$
declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); v public.job_seeker_profiles%rowtype;
begin
 if a is null then raise exception 'UNAUTHORIZED'; end if;
 if p_input is null or jsonb_typeof(p_input) <> 'object'
    or p_contact is null or jsonb_typeof(p_contact) <> 'object' then
   raise exception 'INVALID_INPUT';
 end if;
 select * into v from public.job_seeker_profiles where user_id=a for update;
 if found then
   if v.status not in ('draft','rejected') then raise exception 'PROFILE_NOT_EDITABLE'; end if;
   update public.job_seeker_profiles set display_name=coalesce(p_input->>'display_name',v.display_name),category_id=case when p_input ? 'category_id' then nullif(p_input->>'category_id','')::uuid else v.category_id end,job_role=case when p_input ? 'job_role' then p_input->>'job_role' else v.job_role end,skills=case when p_input ? 'skills' then array(select jsonb_array_elements_text(p_input->'skills')) else v.skills end,experience_months=case when p_input ? 'experience_months' then nullif(p_input->>'experience_months','')::integer else v.experience_months end,education=case when p_input ? 'education' then p_input->>'education' else v.education end,expected_salary_min=case when p_input ? 'expected_salary_min' then nullif(p_input->>'expected_salary_min','')::numeric else v.expected_salary_min end,expected_salary_max=case when p_input ? 'expected_salary_max' then nullif(p_input->>'expected_salary_max','')::numeric else v.expected_salary_max end,preferred_work_types=case when p_input ? 'preferred_work_types' then coalesce((select array_agg(x::public.job_work_type) from jsonb_array_elements_text(p_input->'preferred_work_types') x),'{}') else v.preferred_work_types end,preferred_workplace_types=case when p_input ? 'preferred_workplace_types' then coalesce((select array_agg(x::public.job_workplace_type) from jsonb_array_elements_text(p_input->'preferred_workplace_types') x),'{}') else v.preferred_workplace_types end,city=case when p_input ? 'city' then p_input->>'city' else v.city end,area=case when p_input ? 'area' then p_input->>'area' else v.area end,available_from=case when p_input ? 'available_from' then nullif(p_input->>'available_from','')::date else v.available_from end,bio=case when p_input ? 'bio' then p_input->>'bio' else v.bio end,is_public=case when p_input ? 'is_public' then (p_input->>'is_public')::boolean else v.is_public end,terms_version=case when p_input ? 'terms_version' then p_input->>'terms_version' else v.terms_version end,terms_accepted_at=case when p_input ? 'terms_accepted_at' then nullif(p_input->>'terms_accepted_at','')::timestamptz else v.terms_accepted_at end,privacy_version=case when p_input ? 'privacy_version' then p_input->>'privacy_version' else v.privacy_version end,privacy_accepted_at=case when p_input ? 'privacy_accepted_at' then nullif(p_input->>'privacy_accepted_at','')::timestamptz else v.privacy_accepted_at end,updated_at=now() where id=v.id returning * into v;
 else
   insert into public.job_seeker_profiles(user_id,display_name,photo_path,category_id,job_role,skills,experience_months,education,expected_salary_min,expected_salary_max,preferred_work_types,preferred_workplace_types,city,area,available_from,bio,is_public,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at,status) values(a,p_input->>'display_name',null,nullif(p_input->>'category_id','')::uuid,p_input->>'job_role',coalesce(array(select jsonb_array_elements_text(p_input->'skills')),'{}'),nullif(p_input->>'experience_months','')::integer,p_input->>'education',nullif(p_input->>'expected_salary_min','')::numeric,nullif(p_input->>'expected_salary_max','')::numeric,coalesce((select array_agg(x::public.job_work_type) from jsonb_array_elements_text(p_input->'preferred_work_types') x),'{}'),coalesce((select array_agg(x::public.job_workplace_type) from jsonb_array_elements_text(p_input->'preferred_workplace_types') x),'{}'),p_input->>'city',p_input->>'area',nullif(p_input->>'available_from','')::date,coalesce(p_input->>'bio',''),coalesce((p_input->>'is_public')::boolean,false),p_input->>'terms_version',nullif(p_input->>'terms_accepted_at','')::timestamptz,p_input->>'privacy_version',nullif(p_input->>'privacy_accepted_at','')::timestamptz,'draft') returning * into v;
 end if;
 insert into public.job_seeker_contacts(profile_id,phone,whatsapp,email,phone_consent_at,whatsapp_consent_at,email_consent_at) values(v.id,p_contact->>'phone',p_contact->>'whatsapp',p_contact->>'email',case when coalesce((p_contact->>'phone_public')::boolean,false) then now() end,case when coalesce((p_contact->>'whatsapp_public')::boolean,false) then now() end,case when coalesce((p_contact->>'email_public')::boolean,false) then now() end) on conflict(profile_id) do update set phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,phone_consent_at=excluded.phone_consent_at,whatsapp_consent_at=excluded.whatsapp_consent_at,email_consent_at=excluded.email_consent_at,updated_at=now();
 return v;
end $$;

create function public.job_apply(p_input jsonb)
returns table(id uuid,job_id uuid,applicant_id text,applicant_name text,experience_months integer,skills text[],introduction text,resume_path text,message text,status public.job_application_status,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$ declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); x public.job_applications%rowtype;
begin
 if a is null then raise exception 'UNAUTHORIZED'; end if;
 if p_input is null or jsonb_typeof(p_input) <> 'object' then raise exception 'INVALID_INPUT'; end if;
 if not exists(select 1 from public.jobs j where j.id=(p_input->>'job_id')::uuid and j.employer_id<>a and j.status='active' and (j.application_deadline is null or j.application_deadline>=current_date) and not public.job_is_blocked(a,j.employer_id)) then raise exception 'JOB_NOT_APPLICABLE'; end if;
 insert into public.job_applications(job_id,applicant_id,applicant_name,phone,email,experience_months,skills,introduction,resume_path,message,status) values((p_input->>'job_id')::uuid,a,p_input->>'applicant_name',p_input->>'phone',p_input->>'email',nullif(p_input->>'experience_months','')::integer,coalesce(array(select jsonb_array_elements_text(p_input->'skills')),'{}'),p_input->>'introduction',null,p_input->>'message','applied') returning * into x;
 return query select x.id,x.job_id,x.applicant_id,x.applicant_name,x.experience_months,x.skills,x.introduction,x.resume_path,x.message,x.status,x.created_at,x.updated_at;
end $$;

create or replace function public.job_delete_draft(p_job_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); begin if a is null then raise exception 'UNAUTHORIZED'; end if; delete from public.jobs where id=p_job_id and employer_id=a and status in ('draft','rejected'); if not found then raise exception 'JOB_NOT_DELETABLE'; end if; end $$;
create or replace function public.job_get_my_jobs() returns setof public.jobs language sql security definer set search_path=public as $$ select j.* from public.jobs j where nullif(btrim(auth.jwt()->>'sub'),'') is not null and j.employer_id=nullif(btrim(auth.jwt()->>'sub'),'') order by j.updated_at desc $$;
create or replace function public.job_get_owner_job(p_job_id uuid) returns setof public.jobs language sql security definer set search_path=public as $$ select j.* from public.jobs j where nullif(btrim(auth.jwt()->>'sub'),'') is not null and j.id=p_job_id and j.employer_id=nullif(btrim(auth.jwt()->>'sub'),'') $$;
create or replace function public.job_get_my_seeker_profile() returns setof public.job_seeker_profiles language sql security definer set search_path=public as $$ select p.* from public.job_seeker_profiles p where nullif(btrim(auth.jwt()->>'sub'),'') is not null and p.user_id=nullif(btrim(auth.jwt()->>'sub'),'') $$;
create or replace function public.job_get_my_applications() returns table(id uuid,job_id uuid,applicant_id text,applicant_name text,experience_months integer,skills text[],introduction text,resume_path text,message text,status public.job_application_status,created_at timestamptz,updated_at timestamptz) language sql security definer set search_path=public as $$ select a.id,a.job_id,a.applicant_id,a.applicant_name,a.experience_months,a.skills,a.introduction,a.resume_path,a.message,a.status,a.created_at,a.updated_at from public.job_applications a where nullif(btrim(auth.jwt()->>'sub'),'') is not null and a.applicant_id=nullif(btrim(auth.jwt()->>'sub'),'') order by a.updated_at desc $$;
create or replace function public.job_get_job_applications(p_job_id uuid) returns table(id uuid,job_id uuid,applicant_name text,experience_months integer,skills text[],introduction text,message text,status public.job_application_status,created_at timestamptz,updated_at timestamptz) language sql security definer set search_path=public as $$ select a.id,a.job_id,a.applicant_name,a.experience_months,a.skills,a.introduction,a.message,a.status,a.created_at,a.updated_at from public.job_applications a join public.jobs j on j.id=a.job_id where nullif(btrim(auth.jwt()->>'sub'),'') is not null and a.job_id=p_job_id and j.employer_id=nullif(btrim(auth.jwt()->>'sub'),'') $$;
create or replace function public.job_remove_saved(p_job_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); begin if a is null then raise exception 'UNAUTHORIZED'; end if; delete from public.job_saved where job_id=p_job_id and user_id=a; end $$;
create or replace function public.job_unblock_user(p_user_id text) returns void language plpgsql security definer set search_path=public as $$ declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); begin if a is null or nullif(btrim(p_user_id),'') is null then raise exception 'UNAUTHORIZED'; end if; delete from public.job_blocks where blocker_id=a and blocked_id=p_user_id; end $$;
create or replace function public.job_save_notification_settings(p_input jsonb) returns public.job_notification_settings language plpgsql security definer set search_path=public as $$ declare x public.job_notification_settings; a text:=nullif(btrim(auth.jwt()->>'sub'),''); begin if a is null then raise exception 'UNAUTHORIZED'; end if; insert into public.job_notification_settings(user_id,job_notifications,application_notifications,employer_notifications,match_notifications) values(a,coalesce((p_input->>'jobs')::boolean,true),coalesce((p_input->>'applications')::boolean,true),coalesce((p_input->>'employer')::boolean,true),coalesce((p_input->>'matches')::boolean,true)) on conflict(user_id) do update set job_notifications=excluded.job_notifications,application_notifications=excluded.application_notifications,employer_notifications=excluded.employer_notifications,match_notifications=excluded.match_notifications,updated_at=now() returning * into x; return x; end $$;

create or replace function public.job_report(p_job_id uuid,p_reason public.job_report_reason,p_details text default null) returns public.job_reports language plpgsql security definer set search_path=public as $$ declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); x public.job_reports; begin if a is null or not exists(select 1 from public.jobs where id=p_job_id and employer_id<>a) then raise exception 'REPORT_TARGET_NOT_ALLOWED'; end if; insert into public.job_reports(reporter_id,job_id,reason,details) values(a,p_job_id,p_reason,left(p_details,2000)) returning * into x; return x; end $$;
create or replace function public.job_report_profile(p_profile_id uuid,p_reason public.job_report_reason,p_details text default null) returns public.job_reports language plpgsql security definer set search_path=public as $$ declare a text:=nullif(btrim(auth.jwt()->>'sub'),''); x public.job_reports; begin if a is null or not exists(select 1 from public.job_seeker_profiles where id=p_profile_id and user_id<>a) then raise exception 'REPORT_TARGET_NOT_ALLOWED'; end if; insert into public.job_reports(reporter_id,profile_id,reason,details) values(a,p_profile_id,p_reason,left(p_details,2000)) returning * into x; return x; end $$;

revoke all on function public.job_save_draft(jsonb,uuid,jsonb),public.job_save_seeker_profile(jsonb,jsonb),public.job_apply(jsonb),public.job_delete_draft(uuid),public.job_get_my_jobs(),public.job_get_owner_job(uuid),public.job_get_my_seeker_profile(),public.job_get_my_applications(),public.job_get_job_applications(uuid),public.job_remove_saved(uuid),public.job_unblock_user(text),public.job_save_notification_settings(jsonb),public.job_report(uuid,public.job_report_reason,text),public.job_report_profile(uuid,public.job_report_reason,text) from public;
grant execute on function public.job_save_draft(jsonb,uuid,jsonb),public.job_save_seeker_profile(jsonb,jsonb),public.job_apply(jsonb),public.job_delete_draft(uuid),public.job_get_my_jobs(),public.job_get_owner_job(uuid),public.job_get_my_seeker_profile(),public.job_get_my_applications(),public.job_get_job_applications(uuid),public.job_remove_saved(uuid),public.job_unblock_user(text),public.job_save_notification_settings(jsonb),public.job_report(uuid,public.job_report_reason,text),public.job_report_profile(uuid,public.job_report_reason,text) to anon,authenticated;
grant execute on function public.job_submit(uuid),public.job_submit_seeker_profile(uuid),public.job_set_status(uuid,public.job_status),public.job_set_application_status(uuid,public.job_application_status),public.job_upsert_employer_contact(uuid,text,text,text,text,boolean,boolean,boolean),public.job_upsert_seeker_contact(uuid,text,text,text,boolean,boolean,boolean),public.job_save(uuid),public.job_block_user(text),public.job_invite_worker(uuid,uuid,text),public.job_get_employer_contact(uuid),public.job_prepare_application_resume(uuid,text),public.job_attach_application_resume(uuid,text),public.job_prepare_seeker_photo(uuid,text),public.job_attach_seeker_photo(uuid,text) to anon;

create function public.job_storage_seeker_owner(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select nullif(btrim(auth.jwt()->>'sub'),'') is not null and exists(select 1 from public.job_seeker_profiles where id=p_id and user_id=nullif(btrim(auth.jwt()->>'sub'),'')) $$;
create function public.job_storage_seeker_upload_allowed(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select nullif(btrim(auth.jwt()->>'sub'),'') is not null and exists(select 1 from public.job_seeker_profiles where id=p_id and user_id=nullif(btrim(auth.jwt()->>'sub'),'') and status='draft') $$;
create function public.job_storage_application_owner(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select nullif(btrim(auth.jwt()->>'sub'),'') is not null and exists(select 1 from public.job_applications where id=p_id and applicant_id=nullif(btrim(auth.jwt()->>'sub'),'')) $$;
create function public.job_storage_application_upload_allowed(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select nullif(btrim(auth.jwt()->>'sub'),'') is not null and exists(select 1 from public.job_applications where id=p_id and applicant_id=nullif(btrim(auth.jwt()->>'sub'),'') and status='applied') $$;
revoke all on function public.job_storage_seeker_owner(uuid),public.job_storage_seeker_upload_allowed(uuid),public.job_storage_application_owner(uuid),public.job_storage_application_upload_allowed(uuid) from public;
grant execute on function public.job_storage_seeker_owner(uuid),public.job_storage_seeker_upload_allowed(uuid),public.job_storage_application_owner(uuid),public.job_storage_application_upload_allowed(uuid) to anon,authenticated;
create policy "job private media anon owner uploads"
on storage.objects for insert to anon
with check (
  (
    bucket_id='job-private-media'
    and (storage.foldername(storage.objects.name))[1]='job-seekers'
    and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
    and storage.objects.name ~* '^job-seekers/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$'
    and public.job_storage_seeker_upload_allowed(((storage.foldername(storage.objects.name))[3])::uuid)
  )
  or (
    bucket_id='job-private-media'
    and (storage.foldername(storage.objects.name))[1]='job-resumes'
    and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
    and storage.objects.name ~ '^job-resumes/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$'
    and public.job_storage_application_upload_allowed(((storage.foldername(storage.objects.name))[3])::uuid)
  )
);
create policy "job private media anon owner reads" on storage.objects for select to anon using(
  (bucket_id='job-private-media' and storage.objects.name ~ '^job-seekers/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$' and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
   and public.job_storage_seeker_owner(((storage.foldername(storage.objects.name))[3])::uuid))
  or (bucket_id='job-private-media' and storage.objects.name ~ '^job-resumes/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$' and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
   and public.job_storage_application_owner(((storage.foldername(storage.objects.name))[3])::uuid)));
create policy "job private media anon owner deletes" on storage.objects for delete to anon using(
  (bucket_id='job-private-media' and storage.objects.name ~ '^job-seekers/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$' and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
   and public.job_storage_seeker_owner(((storage.foldername(storage.objects.name))[3])::uuid))
  or (bucket_id='job-private-media' and storage.objects.name ~ '^job-resumes/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$' and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
   and public.job_storage_application_owner(((storage.foldername(storage.objects.name))[3])::uuid)));

commit;