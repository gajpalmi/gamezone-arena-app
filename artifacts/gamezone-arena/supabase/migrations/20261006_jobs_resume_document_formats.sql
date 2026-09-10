begin;

-- The private resume bucket already permits PDF and DOCX. Keep the owner-only
-- path checks while allowing the formats exposed by the application form.
create or replace function public.job_prepare_application_resume(
  p_application_id uuid,
  p_extension text
)
returns text
language plpgsql
security definer
set search_path=public,storage
as $$
declare
  actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
  extension text:=lower(trim(p_extension));
  path text;
begin
  if actor is null then raise exception 'UNAUTHORIZED'; end if;
  if extension not in ('jpg','jpeg','png','webp','pdf','docx') then
    raise exception 'INVALID_RESUME_EXTENSION';
  end if;
  if not exists(
    select 1 from public.job_applications
    where id=p_application_id and applicant_id=actor and status='applied'
  ) then
    raise exception 'APPLICATION_NOT_APPLIED_OWNER';
  end if;
  path:='job-resumes/'||actor||'/'||p_application_id::text||'/'||
    gen_random_uuid()::text||'.'||extension;
  return path;
end
$$;

create or replace function public.job_attach_application_resume(
  p_application_id uuid,
  p_path text
)
returns void
language plpgsql
security definer
set search_path=public,storage
as $$
declare actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
begin
  if actor is null then raise exception 'UNAUTHORIZED'; end if;
  if p_path !~* (
    '^job-resumes/'||actor||'/'||p_application_id::text||
    '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf|docx)$'
  ) then
    raise exception 'INVALID_RESUME_PATH';
  end if;
  if not exists(
    select 1 from public.job_applications
    where id=p_application_id and applicant_id=actor and status='applied'
  ) then
    raise exception 'APPLICATION_NOT_APPLIED_OWNER';
  end if;
  if not exists(
    select 1 from storage.objects
    where bucket_id='job-private-media' and name=p_path
  ) then
    raise exception 'RESUME_UPLOAD_MISSING';
  end if;
  update public.job_applications
  set resume_path=p_path,updated_at=now()
  where id=p_application_id;
end
$$;

revoke all on function public.job_prepare_application_resume(uuid,text),
  public.job_attach_application_resume(uuid,text)
from public;
grant execute on function public.job_prepare_application_resume(uuid,text),
  public.job_attach_application_resume(uuid,text)
to anon,authenticated;

drop policy if exists "job private media anon owner uploads" on storage.objects;
drop policy if exists "job private media anon owner reads" on storage.objects;
drop policy if exists "job private media anon owner deletes" on storage.objects;

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
    and storage.objects.name ~* '^job-resumes/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp|pdf|docx)$'
    and public.job_storage_application_upload_allowed(((storage.foldername(storage.objects.name))[3])::uuid)
  )
);

create policy "job private media anon owner reads"
on storage.objects for select to anon
using (
  (
    bucket_id='job-private-media'
    and storage.objects.name ~* '^job-seekers/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$'
    and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
    and public.job_storage_seeker_owner(((storage.foldername(storage.objects.name))[3])::uuid)
  )
  or (
    bucket_id='job-private-media'
    and storage.objects.name ~* '^job-resumes/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp|pdf|docx)$'
    and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
    and public.job_storage_application_owner(((storage.foldername(storage.objects.name))[3])::uuid)
  )
);

create policy "job private media anon owner deletes"
on storage.objects for delete to anon
using (
  (
    bucket_id='job-private-media'
    and storage.objects.name ~* '^job-seekers/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp)$'
    and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
    and public.job_storage_seeker_owner(((storage.foldername(storage.objects.name))[3])::uuid)
  )
  or (
    bucket_id='job-private-media'
    and storage.objects.name ~* '^job-resumes/[^/]+/[0-9a-f-]{36}/[^/]+\.(jpg|jpeg|png|webp|pdf|docx)$'
    and (storage.foldername(storage.objects.name))[2]=nullif(btrim(auth.jwt()->>'sub'),'')
    and public.job_storage_application_owner(((storage.foldername(storage.objects.name))[3])::uuid)
  )
);

commit;