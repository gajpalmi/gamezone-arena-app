begin;

create or replace function public.business_delete_user_data()
returns text[]
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
  paths text[];
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;

  select media_paths into paths
  from public.account_deletion_requests
  where owner_user_id=actor
  for update;

  if found then
    return paths;
  end if;

  select coalesce(array_agg(distinct storage_path order by storage_path),'{}')
  into paths
  from (
    select p.storage_path
    from public.business_photos p
    join public.businesses b on b.id=p.business_id
    where b.owner_id=actor
    union all
    select p.storage_path
    from public.business_offering_photos p
    join public.business_offerings o on o.id=p.offering_id
    where o.owner_user_id=actor
    union all
    select profile.photo_path
    from public.job_seeker_profiles profile
    where profile.user_id=actor and profile.photo_path is not null
    union all
    select application.resume_path
    from public.job_applications application
    left join public.jobs job on job.id=application.job_id
    where application.resume_path is not null
      and (application.applicant_id=actor or job.employer_id=actor)
  ) media;

  insert into public.account_deletion_requests(owner_user_id,media_paths)
  values(actor,paths);

  delete from public.business_offering_basket where buyer_id=actor;

  delete from public.job_blocks where blocker_id=actor or blocked_id=actor;
  delete from public.job_saved where user_id=actor;
  delete from public.job_reports where reporter_id=actor or reported_user_id=actor;
  delete from public.job_notifications where user_id=actor;
  delete from public.job_notification_settings where user_id=actor;
  delete from public.employer_job_invites where employer_id=actor;
  delete from public.job_applications where applicant_id=actor;
  delete from public.jobs where employer_id=actor;
  delete from public.job_seeker_profiles where user_id=actor;
  delete from public.job_employer_verification where employer_id=actor;

  delete from public.business_offering_favorites where user_id=actor;
  delete from public.business_offering_reviews where user_id=actor;
  delete from public.business_offering_reports where reporter_id=actor;
  delete from public.business_offering_blocks where user_id=actor;
  delete from public.business_favorites where user_id=actor;
  delete from public.business_reviews where user_id=actor;
  delete from public.business_reports where reporter_id=actor;
  delete from public.business_blocks where user_id=actor;
  delete from public.business_admins where user_id=actor;
  delete from public.business_offerings where owner_user_id=actor;
  delete from public.businesses where owner_id=actor;

  delete from public.ludo_messages where user_id=actor;
  delete from public.ludo_players where user_id=actor;

  return paths;
end
$$;

create or replace function public.business_acknowledge_deleted_media(p_paths text[])
returns text[]
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
  remaining text[];
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;
  if coalesce(cardinality(p_paths),0)=0 then
    raise exception 'At least one deleted media path is required.' using errcode='22023';
  end if;
  if not exists (
    select 1
    from public.account_deletion_requests request
    where request.owner_user_id=actor
      and p_paths <@ request.media_paths
  ) then
    raise exception 'Media acknowledgment does not match the pending deletion.' using errcode='22023';
  end if;
  if exists (
    select 1
    from storage.objects object
    where object.name=any(p_paths)
      and object.bucket_id in ('business-media','job-private-media')
  ) then
    raise exception 'Private media still exists in Storage.' using errcode='55000';
  end if;

  update public.account_deletion_requests request
  set media_paths=array(
        select path
        from unnest(request.media_paths) path
        where not path=any(p_paths)
        order by path
      ),
      updated_at=now()
  where owner_user_id=actor
  returning media_paths into remaining;

  if not found then
    raise exception 'Account deletion was not started.' using errcode='P0002';
  end if;
  return remaining;
end
$$;

create or replace function public.account_deletion_media_path_allowed(
  p_bucket text,
  p_path text
)
returns boolean
language sql
security definer
set search_path=public,pg_temp
as $$
  select
    nullif(btrim(auth.jwt()->>'sub'),'') is not null
    and (
      (p_bucket='job-private-media' and p_path like 'job-seekers/%')
      or (p_bucket='job-private-media' and p_path like 'job-resumes/%')
      or (
        p_bucket='business-media'
        and p_path not like 'job-seekers/%'
        and p_path not like 'job-resumes/%'
      )
    )
    and exists (
      select 1
      from public.account_deletion_requests request
      where request.owner_user_id=auth.jwt()->>'sub'
        and p_path=any(request.media_paths)
    );
$$;

revoke all on function public.business_delete_user_data() from public;
revoke all on function public.business_acknowledge_deleted_media(text[]) from public;
revoke all on function public.account_deletion_media_path_allowed(text,text) from public;
grant execute on function public.business_delete_user_data() to anon,authenticated;
grant execute on function public.business_acknowledge_deleted_media(text[]) to anon,authenticated;
grant execute on function public.account_deletion_media_path_allowed(text,text) to anon,authenticated;

commit;