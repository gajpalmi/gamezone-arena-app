-- Practical categories and private-media attachment endpoints.  The client
-- uploads only a server-prepared path, then records it through these RPCs.
insert into public.job_categories(slug,name,sort_order) values
 ('accounting-finance','Accounting & Finance',10),
 ('administration-office','Administration & Office',20),
 ('customer-service','Customer Service',30),
 ('delivery-logistics','Delivery & Logistics',40),
 ('design-creative','Design & Creative',50),
 ('education-training','Education & Training',60),
 ('engineering-technical','Engineering & Technical',70),
 ('healthcare','Healthcare',80),
 ('hospitality-food','Hospitality & Food',90),
 ('information-technology','Information Technology',100),
 ('manufacturing','Manufacturing',110),
 ('marketing-sales','Marketing & Sales',120),
 ('retail','Retail',130),
 ('security-facilities','Security & Facilities',140),
 ('skilled-trades','Skilled Trades',150)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true;

create or replace function public.job_prepare_seeker_photo(p_profile_id uuid,p_extension text)
returns text language plpgsql security definer set search_path=public,storage as $$
declare actor text:=auth.jwt()->>'sub'; extension text:=lower(trim(p_extension)); path text;
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 if extension not in ('jpg','jpeg','png','webp') then raise exception 'INVALID_IMAGE_EXTENSION'; end if;
 if not exists(select 1 from public.job_seeker_profiles where id=p_profile_id and user_id=actor and status='draft') then raise exception 'PROFILE_NOT_DRAFT_OWNER'; end if;
 path:='job-seekers/'||actor||'/'||p_profile_id::text||'/'||gen_random_uuid()::text||'.'||extension;
 return path;
end $$;

create or replace function public.job_attach_seeker_photo(p_profile_id uuid,p_path text)
returns void language plpgsql security definer set search_path=public,storage as $$
declare actor text:=auth.jwt()->>'sub';
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 if p_path !~ ('^job-seekers/'||actor||'/'||p_profile_id::text||'/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then raise exception 'INVALID_PROFILE_PHOTO_PATH'; end if;
 if not exists(select 1 from public.job_seeker_profiles where id=p_profile_id and user_id=actor and status='draft') then raise exception 'PROFILE_NOT_DRAFT_OWNER'; end if;
 if not exists(select 1 from storage.objects where bucket_id='job-private-media' and name=p_path) then raise exception 'PROFILE_PHOTO_UPLOAD_MISSING'; end if;
 update public.job_seeker_profiles set photo_path=p_path,updated_at=now() where id=p_profile_id;
end $$;

create or replace function public.job_prepare_application_resume(p_application_id uuid,p_extension text)
returns text language plpgsql security definer set search_path=public,storage as $$
declare actor text:=auth.jwt()->>'sub'; extension text:=lower(trim(p_extension)); path text;
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 if extension not in ('jpg','jpeg','png','webp') then raise exception 'INVALID_RESUME_IMAGE_EXTENSION'; end if;
 if not exists(select 1 from public.job_applications where id=p_application_id and applicant_id=actor and status='applied') then raise exception 'APPLICATION_NOT_APPLIED_OWNER'; end if;
 path:='job-resumes/'||actor||'/'||p_application_id::text||'/'||gen_random_uuid()::text||'.'||extension;
 return path;
end $$;

create or replace function public.job_attach_application_resume(p_application_id uuid,p_path text)
returns void language plpgsql security definer set search_path=public,storage as $$
declare actor text:=auth.jwt()->>'sub';
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 if p_path !~ ('^job-resumes/'||actor||'/'||p_application_id::text||'/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') then raise exception 'INVALID_RESUME_PATH'; end if;
 if not exists(select 1 from public.job_applications where id=p_application_id and applicant_id=actor and status='applied') then raise exception 'APPLICATION_NOT_APPLIED_OWNER'; end if;
 if not exists(select 1 from storage.objects where bucket_id='job-private-media' and name=p_path) then raise exception 'RESUME_UPLOAD_MISSING'; end if;
 update public.job_applications set resume_path=p_path,updated_at=now() where id=p_application_id;
end $$;

revoke all on function public.job_prepare_seeker_photo(uuid,text),public.job_attach_seeker_photo(uuid,text),public.job_prepare_application_resume(uuid,text),public.job_attach_application_resume(uuid,text) from public,anon;
grant execute on function public.job_prepare_seeker_photo(uuid,text),public.job_attach_seeker_photo(uuid,text),public.job_prepare_application_resume(uuid,text),public.job_attach_application_resume(uuid,text) to authenticated;