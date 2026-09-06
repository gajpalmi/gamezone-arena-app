-- Follow-up hardening.  All enum additions were committed in the preceding
-- migration before public.business_moderation_target values are used.

drop policy if exists "applicants withdraw applications" on public.job_applications;

create or replace function public.job_set_application_status(
  p_application_id uuid,
  p_status public.job_application_status
) returns void language plpgsql security definer set search_path=public as $$
declare
  a public.job_applications%rowtype;
  owner_id text;
  actor text:=auth.jwt()->>'sub';
  notify_enabled boolean;
begin
  select * into a from public.job_applications where id=p_application_id for update;
  if actor is null or not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  select employer_id into owner_id from public.jobs where id=a.job_id;
  if actor=a.applicant_id then
    if p_status<>'withdrawn' or a.status in ('withdrawn','selected','rejected') then
      raise exception 'APPLICATION_INVALID_TRANSITION';
    end if;
    update public.job_applications set status='withdrawn',status_updated_at=now(),updated_at=now() where id=a.id;
    return;
  end if;
  if actor<>owner_id then raise exception 'APPLICATION_NOT_JOB_OWNER'; end if;
  if a.status in ('withdrawn','selected','rejected') or p_status in ('applied','withdrawn') then
    raise exception 'APPLICATION_INVALID_TRANSITION';
  end if;
  update public.job_applications set status=p_status,viewed_at=case when p_status='viewed' then now() else viewed_at end,status_updated_at=now(),updated_at=now() where id=a.id;
  select coalesce(application_notifications,true) into notify_enabled from public.job_notification_settings where user_id=a.applicant_id;
  if coalesce(notify_enabled,true) then
    insert into public.job_notifications(user_id,kind,title,body,job_id,application_id)
    values(a.applicant_id,'application_status','Application status updated',p_status::text,a.job_id,a.id);
  end if;
end $$;

create or replace function public.job_upsert_employer_contact(
  p_job_id uuid,p_phone text default null,p_whatsapp text default null,p_email text default null,p_website text default null,
  p_phone_public boolean default false,p_whatsapp_public boolean default false,p_email_public boolean default false
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.jwt()->>'sub' is null or not exists(select 1 from public.jobs where id=p_job_id and employer_id=auth.jwt()->>'sub') then raise exception 'JOB_NOT_OWNER'; end if;
 insert into public.job_contacts(job_id,phone,whatsapp,email,website,phone_consent_at,whatsapp_consent_at,email_consent_at)
 values(p_job_id,p_phone,p_whatsapp,p_email,p_website,case when p_phone_public then now() end,case when p_whatsapp_public then now() end,case when p_email_public then now() end)
 on conflict(job_id) do update set phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,website=excluded.website,phone_consent_at=excluded.phone_consent_at,whatsapp_consent_at=excluded.whatsapp_consent_at,email_consent_at=excluded.email_consent_at,updated_at=now();
end $$;
create or replace function public.job_upsert_seeker_contact(
  p_profile_id uuid,p_phone text default null,p_whatsapp text default null,p_email text default null,
  p_phone_public boolean default false,p_whatsapp_public boolean default false,p_email_public boolean default false
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.jwt()->>'sub' is null or not exists(select 1 from public.job_seeker_profiles where id=p_profile_id and user_id=auth.jwt()->>'sub') then raise exception 'PROFILE_NOT_OWNER'; end if;
 insert into public.job_seeker_contacts(profile_id,phone,whatsapp,email,phone_consent_at,whatsapp_consent_at,email_consent_at)
 values(p_profile_id,p_phone,p_whatsapp,p_email,case when p_phone_public then now() end,case when p_whatsapp_public then now() end,case when p_email_public then now() end)
 on conflict(profile_id) do update set phone=excluded.phone,whatsapp=excluded.whatsapp,email=excluded.email,phone_consent_at=excluded.phone_consent_at,whatsapp_consent_at=excluded.whatsapp_consent_at,email_consent_at=excluded.email_consent_at,updated_at=now();
end $$;

-- Interaction tables already have safe owner-scoped RLS policies.  These
-- convenience RPCs give clients a stable mutation surface without bypassing
-- their visibility checks.
create or replace function public.job_save(p_job_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin if auth.jwt()->>'sub' is null or not public.job_can_view(p_job_id) then raise exception 'JOB_NOT_SAVABLE'; end if;
 insert into public.job_saved(job_id,user_id) values(p_job_id,auth.jwt()->>'sub') on conflict do nothing; end $$;
create or replace function public.job_block_user(p_blocked_id text) returns void language plpgsql security definer set search_path=public as $$
begin if auth.jwt()->>'sub' is null or p_blocked_id is null or p_blocked_id=auth.jwt()->>'sub' then raise exception 'INVALID_BLOCK'; end if;
 insert into public.job_blocks(blocker_id,blocked_id) values(auth.jwt()->>'sub',p_blocked_id) on conflict do nothing; end $$;
create or replace function public.job_invite_worker(p_job_id uuid,p_profile_id uuid,p_message text default null) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.jwt()->>'sub' is null or not exists(select 1 from public.jobs j join public.job_seeker_profiles p on p.id=p_profile_id where j.id=p_job_id and j.employer_id=auth.jwt()->>'sub' and j.status='active' and p.status='active' and p.is_public and not public.job_is_blocked(j.employer_id,p.user_id)) then raise exception 'INVITE_NOT_ALLOWED'; end if;
 insert into public.employer_job_invites(job_id,profile_id,employer_id,message) values(p_job_id,p_profile_id,auth.jwt()->>'sub',left(p_message,2000)) on conflict(job_id,profile_id) do nothing;
end $$;

revoke all on function public.job_validate_report(),public.job_application_notify_employer() from public,anon,authenticated;
revoke all on function public.job_set_application_status(uuid,public.job_application_status),public.job_upsert_employer_contact(uuid,text,text,text,text,boolean,boolean,boolean),public.job_upsert_seeker_contact(uuid,text,text,text,boolean,boolean,boolean),public.job_save(uuid),public.job_block_user(text),public.job_invite_worker(uuid,uuid,text) from public,anon;
grant execute on function public.job_set_application_status(uuid,public.job_application_status),public.job_upsert_employer_contact(uuid,text,text,text,text,boolean,boolean,boolean),public.job_upsert_seeker_contact(uuid,text,text,text,boolean,boolean,boolean),public.job_save(uuid),public.job_block_user(text),public.job_invite_worker(uuid,uuid,text) to authenticated;