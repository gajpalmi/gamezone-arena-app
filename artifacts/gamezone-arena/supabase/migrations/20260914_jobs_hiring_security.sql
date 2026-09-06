-- Additive Jobs & Hiring schema. Contact data is intentionally separated from
-- public listings/profiles so a row policy can never accidentally expose it.

create type public.job_status as enum ('draft','pending','active','paused','closed','rejected','suspended');
create type public.job_work_type as enum ('full_time','part_time','temporary','contract','internship','freelance');
create type public.job_workplace_type as enum ('on_site','remote','hybrid');
create type public.job_salary_type as enum ('monthly','daily','hourly','yearly','negotiable');
create type public.job_application_status as enum ('applied','viewed','shortlisted','contacted','interview','selected','rejected','withdrawn');
create type public.job_employer_verification_status as enum ('unverified','pending','verified','suspended');
create type public.job_report_reason as enum ('fake_job','scam','misleading_information','spam','inappropriate_content','illegal_activity','discrimination','harassment','other');
create type public.job_invite_status as enum ('pending','accepted','declined','withdrawn');
create table public.job_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.job_seeker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique default (auth.jwt()->>'sub'),
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  photo_path text check (photo_path ~ '^job-seekers/[^/]+/[^/]+/.+$'),
  category_id uuid references public.job_categories(id),
  job_role text check (char_length(job_role)<=120), skills text[] not null default '{}' check(cardinality(skills)<=50),
  experience_months integer check(experience_months is null or experience_months between 0 and 840),
  education text check(char_length(education)<=500), expected_salary_min numeric(12,2) check(expected_salary_min is null or expected_salary_min>=0),
  expected_salary_max numeric(12,2) check(expected_salary_max is null or expected_salary_max>=0),
  preferred_work_types public.job_work_type[] not null default '{}' check(cardinality(preferred_work_types)<=6),
  preferred_workplace_types public.job_workplace_type[] not null default '{}' check(cardinality(preferred_workplace_types)<=3),
  city text check(char_length(city)<=120), area text check(char_length(area)<=120), available_from date,
  bio text not null default '' check(char_length(bio)<=2000),
  is_public boolean not null default false, status public.job_status not null default 'draft'
    check(status in ('draft','pending','active','rejected','suspended')),
  terms_version text, terms_accepted_at timestamptz, privacy_version text, privacy_accepted_at timestamptz,
  submitted_at timestamptz, approved_at timestamptz, approved_by text, rejection_reason text check(char_length(rejection_reason)<=1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(expected_salary_max is null or expected_salary_min is null or expected_salary_max>=expected_salary_min)
);
create table public.job_seeker_contacts (
  profile_id uuid primary key references public.job_seeker_profiles(id) on delete cascade,
  phone text check(phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  whatsapp text check(whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  email text check(email is null or char_length(email)<=254),
  phone_consent_at timestamptz, whatsapp_consent_at timestamptz, email_consent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id text not null default (auth.jwt()->>'sub'),
  business_id uuid references public.businesses(id) on delete set null,
  category_id uuid references public.job_categories(id),
  title text not null check(char_length(trim(title)) between 2 and 160),
  company_name text not null check(char_length(trim(company_name)) between 2 and 160),
  employer_name text not null check(char_length(trim(employer_name)) between 2 and 120),
  job_role text check(char_length(job_role)<=120), description text not null check(char_length(description) between 20 and 8000),
  responsibilities text check(char_length(responsibilities)<=5000), required_skills text[] not null default '{}' check(cardinality(required_skills)<=50),
  required_experience_months integer check(required_experience_months is null or required_experience_months between 0 and 840),
  education_requirement text check(char_length(education_requirement)<=500),
  vacancies integer not null default 1 check(vacancies between 1 and 10000),
  salary_min numeric(12,2) check(salary_min is null or salary_min>=0), salary_max numeric(12,2) check(salary_max is null or salary_max>=0),
  salary_type public.job_salary_type not null default 'negotiable', work_type public.job_work_type not null,
  workplace_type public.job_workplace_type not null, location_text text check(char_length(location_text)<=500),
  city text not null check(char_length(trim(city)) between 2 and 120), area text check(char_length(area)<=120),
  working_hours text check(char_length(working_hours)<=500), weekly_off text check(char_length(weekly_off)<=240),
  benefits text check(char_length(benefits)<=3000), requirements text check(char_length(requirements)<=4000),
  joining_date date, application_deadline date, is_featured boolean not null default false,
  status public.job_status not null default 'draft', submitted_at timestamptz, approved_at timestamptz, approved_by text,
  rejection_reason text check(char_length(rejection_reason)<=1000), terms_version text, terms_accepted_at timestamptz,
  privacy_version text, privacy_accepted_at timestamptz, rules_version text, rules_accepted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(salary_max is null or salary_min is null or salary_max>=salary_min),
  check(application_deadline is null or joining_date is null or application_deadline<=joining_date)
);
create table public.job_contacts (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  phone text check(phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  whatsapp text check(whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  email text check(email is null or char_length(email)<=254), website text check(website is null or website ~* '^https?://[^[:space:]]+$'),
  phone_consent_at timestamptz, whatsapp_consent_at timestamptz, email_consent_at timestamptz, updated_at timestamptz not null default now()
);
create table public.job_employer_verification (
  employer_id text primary key, business_id uuid references public.businesses(id) on delete set null,
  status public.job_employer_verification_status not null default 'unverified', reviewed_by text, reviewed_at timestamptz,
  notes text check(char_length(notes)<=2000), updated_at timestamptz not null default now()
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id text not null default (auth.jwt()->>'sub'), applicant_name text not null check(char_length(trim(applicant_name)) between 2 and 120),
  phone text not null check(phone ~ '^\+?[0-9][0-9 ()-]{6,38}$'), email text check(email is null or char_length(email)<=254),
  experience_months integer check(experience_months is null or experience_months between 0 and 840),
  skills text[] not null default '{}' check(cardinality(skills)<=50), introduction text check(char_length(introduction)<=2000),
  resume_path text check(resume_path is null or resume_path ~ '^job-resumes/[^/]+/[^/]+/.+$'), message text check(char_length(message)<=3000),
  status public.job_application_status not null default 'applied', viewed_at timestamptz, status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(job_id,applicant_id)
);
create table public.job_saved (
  job_id uuid not null references public.jobs(id) on delete cascade, user_id text not null default(auth.jwt()->>'sub'),
  created_at timestamptz not null default now(), primary key(job_id,user_id)
);
create table public.job_blocks (
  blocker_id text not null default(auth.jwt()->>'sub'), blocked_id text not null, created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table public.employer_job_invites (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid not null references public.job_seeker_profiles(id) on delete cascade, employer_id text not null default(auth.jwt()->>'sub'),
  message text check(char_length(message)<=2000), status public.job_invite_status not null default 'pending',
  created_at timestamptz not null default now(), responded_at timestamptz, unique(job_id,profile_id)
);
create table public.job_notifications (
  id uuid primary key default gen_random_uuid(), user_id text not null, kind text not null check(char_length(kind) between 2 and 80),
  title text not null check(char_length(title)<=200), body text check(char_length(body)<=1000), job_id uuid references public.jobs(id) on delete cascade,
  application_id uuid references public.job_applications(id) on delete cascade, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.job_notification_settings (
  user_id text primary key default(auth.jwt()->>'sub'), job_notifications boolean not null default true,
  application_notifications boolean not null default true, employer_notifications boolean not null default true,
  match_notifications boolean not null default true, marketing_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.job_reports (
  id uuid primary key default gen_random_uuid(), reporter_id text not null default(auth.jwt()->>'sub'),
  job_id uuid references public.jobs(id) on delete cascade, profile_id uuid references public.job_seeker_profiles(id) on delete cascade,
  application_id uuid references public.job_applications(id) on delete cascade, reported_user_id text,
  reason public.job_report_reason not null, details text check(char_length(details)<=2000), created_at timestamptz not null default now(),
  resolved_at timestamptz, resolved_by text, check(num_nonnulls(job_id,profile_id,application_id,reported_user_id)=1)
);

create index jobs_public_browse_idx on public.jobs(category_id,city,created_at desc) where status='active';
create index jobs_employer_idx on public.jobs(employer_id,updated_at desc);
create index job_profiles_public_idx on public.job_seeker_profiles(category_id,city,updated_at desc) where status='active' and is_public;
create index job_applications_job_idx on public.job_applications(job_id,created_at desc);
create index job_notifications_user_idx on public.job_notifications(user_id,created_at desc);
create index job_reports_open_idx on public.job_reports(created_at) where resolved_at is null;
create unique index job_reports_open_unique on public.job_reports(reporter_id,coalesce(job_id::text,profile_id::text,application_id::text,reported_user_id),reason) where resolved_at is null;

create or replace function public.job_is_blocked(p_one text,p_other text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.job_blocks where (blocker_id=p_one and blocked_id=p_other) or (blocker_id=p_other and blocked_id=p_one));
$$;
create or replace function public.job_can_view(p_job_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.jobs j where j.id=p_job_id and j.status='active' and (j.application_deadline is null or j.application_deadline>=current_date) and not public.job_is_blocked(auth.jwt()->>'sub',j.employer_id));
$$;
revoke all on function public.job_is_blocked(text,text),public.job_can_view(uuid) from public,anon;
grant execute on function public.job_is_blocked(text,text),public.job_can_view(uuid) to authenticated;

alter table public.job_categories enable row level security;
alter table public.job_seeker_profiles enable row level security; alter table public.job_seeker_contacts enable row level security;
alter table public.jobs enable row level security; alter table public.job_contacts enable row level security; alter table public.job_employer_verification enable row level security;
alter table public.job_applications enable row level security; alter table public.job_saved enable row level security; alter table public.job_blocks enable row level security;
alter table public.employer_job_invites enable row level security; alter table public.job_notifications enable row level security; alter table public.job_notification_settings enable row level security; alter table public.job_reports enable row level security;
create policy "active job categories readable" on public.job_categories for select to authenticated using(is_active);
create policy "public or own worker profiles" on public.job_seeker_profiles for select to authenticated using((is_public and status='active' and not public.job_is_blocked(auth.jwt()->>'sub',user_id)) or user_id=auth.jwt()->>'sub' or public.business_is_admin());
create policy "owners create worker profiles" on public.job_seeker_profiles for insert to authenticated with check(user_id=auth.jwt()->>'sub' and status='draft');
create policy "owners edit unsubmitted worker profiles" on public.job_seeker_profiles for update to authenticated using(user_id=auth.jwt()->>'sub' and status in ('draft','rejected')) with check(user_id=auth.jwt()->>'sub' and status in ('draft','rejected'));
create policy "owners delete worker profiles" on public.job_seeker_profiles for delete to authenticated using(user_id=auth.jwt()->>'sub' and status in ('draft','rejected'));
create policy "owners manage private worker contacts" on public.job_seeker_contacts for all to authenticated using(exists(select 1 from public.job_seeker_profiles p where p.id=profile_id and p.user_id=auth.jwt()->>'sub')) with check(exists(select 1 from public.job_seeker_profiles p where p.id=profile_id and p.user_id=auth.jwt()->>'sub'));
create policy "public or employer jobs read" on public.jobs for select to authenticated using((status='active' and (application_deadline is null or application_deadline>=current_date) and not public.job_is_blocked(auth.jwt()->>'sub',employer_id)) or employer_id=auth.jwt()->>'sub' or public.business_is_admin());
create policy "employers create jobs" on public.jobs for insert to authenticated with check(employer_id=auth.jwt()->>'sub' and status='draft' and (business_id is null or exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.jwt()->>'sub')));
create policy "employers edit draft/rejected jobs" on public.jobs for update to authenticated using(employer_id=auth.jwt()->>'sub' and status in ('draft','rejected')) with check(employer_id=auth.jwt()->>'sub' and status in ('draft','rejected'));
create policy "employers delete draft/rejected jobs" on public.jobs for delete to authenticated using(employer_id=auth.jwt()->>'sub' and status in ('draft','rejected'));
create policy "employers manage private job contacts" on public.job_contacts for all to authenticated using(exists(select 1 from public.jobs j where j.id=job_id and j.employer_id=auth.jwt()->>'sub')) with check(exists(select 1 from public.jobs j where j.id=job_id and j.employer_id=auth.jwt()->>'sub'));
create policy "users read employer verification" on public.job_employer_verification for select to authenticated using(true);
create policy "applicant or job employer reads applications" on public.job_applications for select to authenticated using(applicant_id=auth.jwt()->>'sub' or exists(select 1 from public.jobs j where j.id=job_id and j.employer_id=auth.jwt()->>'sub') or public.business_is_admin());
create policy "applicants submit applications" on public.job_applications for insert to authenticated with check(applicant_id=auth.jwt()->>'sub' and public.job_can_view(job_id) and exists(select 1 from public.jobs j where j.id=job_id and j.employer_id<>auth.jwt()->>'sub'));
create policy "applicants withdraw applications" on public.job_applications for update to authenticated using(applicant_id=auth.jwt()->>'sub' and status not in ('withdrawn','selected','rejected')) with check(applicant_id=auth.jwt()->>'sub' and status='withdrawn');
create policy "users manage own job saves" on public.job_saved for all to authenticated using(user_id=auth.jwt()->>'sub') with check(user_id=auth.jwt()->>'sub' and public.job_can_view(job_id));
create policy "users manage own job blocks" on public.job_blocks for all to authenticated using(blocker_id=auth.jwt()->>'sub') with check(blocker_id=auth.jwt()->>'sub');
create policy "invite parties read" on public.employer_job_invites for select to authenticated using(employer_id=auth.jwt()->>'sub' or exists(select 1 from public.job_seeker_profiles p where p.id=profile_id and p.user_id=auth.jwt()->>'sub') or public.business_is_admin());
create policy "employers invite public workers" on public.employer_job_invites for insert to authenticated with check(employer_id=auth.jwt()->>'sub' and exists(select 1 from public.jobs j join public.job_seeker_profiles p on p.id=profile_id where j.id=job_id and j.employer_id=auth.jwt()->>'sub' and j.status='active' and p.is_public and p.status='active' and not public.job_is_blocked(j.employer_id,p.user_id)));
create policy "workers respond to own invites" on public.employer_job_invites for update to authenticated using(exists(select 1 from public.job_seeker_profiles p where p.id=profile_id and p.user_id=auth.jwt()->>'sub')) with check(status in ('accepted','declined'));
create policy "users read own job notifications" on public.job_notifications for select to authenticated using(user_id=auth.jwt()->>'sub');
create policy "users update own job notifications" on public.job_notifications for update to authenticated using(user_id=auth.jwt()->>'sub') with check(user_id=auth.jwt()->>'sub');
create policy "users manage job notification settings" on public.job_notification_settings for all to authenticated using(user_id=auth.jwt()->>'sub') with check(user_id=auth.jwt()->>'sub');
create policy "reporters and admins read job reports" on public.job_reports for select to authenticated using(reporter_id=auth.jwt()->>'sub' or public.business_is_admin());
create policy "users submit job reports" on public.job_reports for insert to authenticated with check(reporter_id=auth.jwt()->>'sub');

-- Resumes and optional seeker photos remain private storage objects.  There is
-- no public bucket or anonymous read path for either kind of media.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('job-private-media','job-private-media',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "job private media owner uploads" on storage.objects for insert to authenticated with check(
 (bucket_id='job-private-media' and (storage.foldername(name))[1]='job-seekers' and (storage.foldername(name))[2]=auth.jwt()->>'sub'
  and exists(select 1 from public.job_seeker_profiles p where p.id::text=(storage.foldername(name))[3] and p.user_id=auth.jwt()->>'sub'))
 or (bucket_id='job-private-media' and (storage.foldername(name))[1]='job-resumes' and (storage.foldername(name))[2]=auth.jwt()->>'sub'
  and exists(select 1 from public.job_applications a where a.id::text=(storage.foldername(name))[3] and a.applicant_id=auth.jwt()->>'sub'))
);
create policy "job private media authorized reads" on storage.objects for select to authenticated using(
 (bucket_id='job-private-media' and (storage.foldername(name))[1]='job-seekers' and exists(select 1 from public.job_seeker_profiles p where p.id::text=(storage.foldername(name))[3] and (p.user_id=auth.jwt()->>'sub' or (p.is_public and p.status='active' and not public.job_is_blocked(auth.jwt()->>'sub',p.user_id)) or public.business_is_admin())))
 or (bucket_id='job-private-media' and (storage.foldername(name))[1]='job-resumes' and exists(select 1 from public.job_applications a join public.jobs j on j.id=a.job_id where a.id::text=(storage.foldername(name))[3] and (a.applicant_id=auth.jwt()->>'sub' or j.employer_id=auth.jwt()->>'sub' or public.business_is_admin())))
);
create policy "job private media owner deletes" on storage.objects for delete to authenticated using(bucket_id='job-private-media' and (storage.foldername(name))[2]=auth.jwt()->>'sub');

create or replace function public.job_application_notify_employer() returns trigger language plpgsql security definer set search_path=public as $$
declare employer text; enabled boolean; begin
 select j.employer_id,coalesce(s.employer_notifications,true) into employer,enabled from public.jobs j left join public.job_notification_settings s on s.user_id=j.employer_id where j.id=new.job_id;
 if enabled then insert into public.job_notifications(user_id,kind,title,body,job_id,application_id) values(employer,'new_application','New job application','A candidate applied to your job.',new.job_id,new.id); end if;
 return new;
end $$;
create trigger job_application_notify_employer after insert on public.job_applications for each row execute function public.job_application_notify_employer();

create or replace function public.job_submit(p_job_id uuid) returns public.jobs language plpgsql security definer set search_path=public as $$
declare v public.jobs%rowtype; begin
 select * into v from public.jobs where id=p_job_id for update;
 if auth.jwt()->>'sub' is null or not found or v.employer_id<>auth.jwt()->>'sub' then raise exception 'JOB_NOT_OWNER'; end if;
 if v.status not in ('draft','rejected') or v.terms_version is null or v.terms_accepted_at is null or v.privacy_version is null or v.privacy_accepted_at is null or v.rules_version is null or v.rules_accepted_at is null then raise exception 'JOB_NOT_SUBMITTABLE'; end if;
 update public.jobs set status='pending',submitted_at=now(),rejection_reason=null,updated_at=now() where id=p_job_id returning * into v; return v;
end $$;
create or replace function public.job_submit_seeker_profile(p_profile_id uuid) returns public.job_seeker_profiles language plpgsql security definer set search_path=public as $$
declare v public.job_seeker_profiles%rowtype; begin select * into v from public.job_seeker_profiles where id=p_profile_id for update;
 if auth.jwt()->>'sub' is null or not found or v.user_id<>auth.jwt()->>'sub' then raise exception 'PROFILE_NOT_OWNER'; end if;
 if v.status not in ('draft','rejected') or v.terms_version is null or v.terms_accepted_at is null or v.privacy_version is null or v.privacy_accepted_at is null then raise exception 'PROFILE_NOT_SUBMITTABLE'; end if;
 update public.job_seeker_profiles set status='pending',submitted_at=now(),rejection_reason=null,updated_at=now() where id=p_profile_id returning * into v; return v;
end $$;
create or replace function public.job_set_status(p_job_id uuid,p_status public.job_status) returns public.jobs language plpgsql security definer set search_path=public as $$
declare v public.jobs%rowtype; begin select * into v from public.jobs where id=p_job_id for update;
 if auth.jwt()->>'sub' is null or not found or v.employer_id<>auth.jwt()->>'sub' then raise exception 'JOB_NOT_OWNER'; end if;
 if (v.status='active' and p_status in ('paused','closed')) or (v.status='paused' and p_status in ('active','closed')) then
  update public.jobs set status=p_status,updated_at=now() where id=p_job_id returning * into v; return v;
 end if; raise exception 'JOB_INVALID_TRANSITION';
end $$;
create or replace function public.job_set_application_status(p_application_id uuid,p_status public.job_application_status) returns void language plpgsql security definer set search_path=public as $$
declare a public.job_applications%rowtype; owner_id text; notify_enabled boolean; begin select * into a from public.job_applications where id=p_application_id for update;
 select employer_id into owner_id from public.jobs where id=a.job_id;
 if auth.jwt()->>'sub' is null or owner_id<>auth.jwt()->>'sub' then raise exception 'APPLICATION_NOT_JOB_OWNER'; end if;
 if a.status in ('withdrawn','selected','rejected') or p_status in ('applied','withdrawn') then raise exception 'APPLICATION_INVALID_TRANSITION'; end if;
 update public.job_applications set status=p_status,viewed_at=case when p_status='viewed' then now() else viewed_at end,status_updated_at=now(),updated_at=now() where id=p_application_id;
 select coalesce(application_notifications,true) into notify_enabled from public.job_notification_settings where user_id=a.applicant_id;
 if coalesce(notify_enabled,true) then insert into public.job_notifications(user_id,kind,title,body,job_id,application_id) values(a.applicant_id,'application_status','Application status updated',p_status::text,a.job_id,a.id); end if;
end $$;
create or replace function public.job_get_employer_contact(p_job_id uuid) returns table(phone text,whatsapp text,email text,website text) language sql security definer set search_path=public as $$
 select case when c.phone_consent_at is not null then c.phone end,case when c.whatsapp_consent_at is not null then c.whatsapp end,case when c.email_consent_at is not null then c.email end,c.website
 from public.job_contacts c join public.jobs j on j.id=c.job_id where c.job_id=p_job_id and public.job_can_view(j.id);
$$;
create or replace function public.job_get_seeker_contact(p_profile_id uuid) returns table(phone text,whatsapp text,email text) language sql security definer set search_path=public as $$
 select case when c.phone_consent_at is not null then c.phone end,case when c.whatsapp_consent_at is not null then c.whatsapp end,case when c.email_consent_at is not null then c.email end
 from public.job_seeker_contacts c join public.job_seeker_profiles p on p.id=c.profile_id
 where c.profile_id=p_profile_id and p.is_public and p.status='active' and exists(select 1 from public.jobs j where j.employer_id=auth.jwt()->>'sub' and j.status='active') and not public.job_is_blocked(auth.jwt()->>'sub',p.user_id);
$$;
create or replace function public.job_validate_report() returns trigger language plpgsql security definer set search_path=public as $$
declare actor text:=auth.jwt()->>'sub'; owner_id text; begin
 if actor is null or new.reporter_id<>actor then raise exception 'UNAUTHORIZED'; end if;
 if (select count(*) from public.job_reports where reporter_id=actor and created_at>now()-interval '1 hour')>=5 then raise exception 'REPORT_RATE_LIMITED'; end if;
 if new.job_id is not null then select employer_id into owner_id from public.jobs where id=new.job_id and status='active';
 elsif new.profile_id is not null then select user_id into owner_id from public.job_seeker_profiles where id=new.profile_id and status='active' and is_public;
 elsif new.application_id is not null then select applicant_id into owner_id from public.job_applications where id=new.application_id;
 else owner_id:=new.reported_user_id; end if;
 if owner_id is null or owner_id=actor then raise exception 'REPORT_TARGET_NOT_ALLOWED'; end if; return new;
end $$;
create trigger job_reports_validate before insert on public.job_reports for each row execute function public.job_validate_report();
create or replace function public.job_admin_moderate(p_target_type public.business_moderation_target,p_target_id uuid,p_action text,p_reason text default null) returns void language plpgsql security definer set search_path=public as $$
declare actor text:=auth.jwt()->>'sub'; begin if actor is null or not public.business_is_admin() then raise exception 'BUSINESS_ADMIN_REQUIRED'; end if;
 if p_target_type='job' and p_action='approve' then update public.jobs set status='active',approved_at=now(),approved_by=actor,rejection_reason=null,updated_at=now() where id=p_target_id and status='pending';
 elsif p_target_type='job' and p_action='reject' then update public.jobs set status='rejected',rejection_reason=left(coalesce(p_reason,''),1000),updated_at=now() where id=p_target_id and status='pending';
 elsif p_target_type='job' and p_action in ('suspend','restore','close') then update public.jobs set status=case p_action when 'restore' then 'active' when 'close' then 'closed' else 'suspended' end,updated_at=now() where id=p_target_id and status in ('active','suspended');
 elsif p_target_type='job_application' and p_action in ('reject','suspend') then update public.job_applications set status='rejected',status_updated_at=now(),updated_at=now() where id=p_target_id and status not in ('rejected','withdrawn');
 elsif p_target_type='job_seeker_profile' and p_action='approve' then update public.job_seeker_profiles set status='active',approved_at=now(),approved_by=actor,rejection_reason=null,updated_at=now() where id=p_target_id and status='pending';
 elsif p_target_type='job_seeker_profile' and p_action='reject' then update public.job_seeker_profiles set status='rejected',rejection_reason=left(coalesce(p_reason,''),1000),updated_at=now() where id=p_target_id and status='pending';
 elsif p_target_type='job_seeker_profile' and p_action in ('suspend','restore') then update public.job_seeker_profiles set status=case p_action when 'restore' then 'active' else 'suspended' end,updated_at=now() where id=p_target_id and status in ('active','suspended');
 elsif p_target_type='job_report' and p_action='resolve' then update public.job_reports set resolved_at=now(),resolved_by=actor where id=p_target_id and resolved_at is null;
 else raise exception 'JOB_INVALID_MODERATION_ACTION'; end if;
 if not found then raise exception 'JOB_INVALID_TRANSITION'; end if;
 insert into public.moderation_actions(admin_id,target_type,target_id,action,reason,metadata) values(actor,p_target_type,p_target_id,p_action,left(p_reason,2000),'{"domain":"jobs"}');
end $$;
revoke all on function public.job_submit(uuid),public.job_submit_seeker_profile(uuid),public.job_set_status(uuid,public.job_status),public.job_set_application_status(uuid,public.job_application_status),public.job_get_employer_contact(uuid),public.job_get_seeker_contact(uuid),public.job_validate_report(),public.job_application_notify_employer(),public.job_admin_moderate(public.business_moderation_target,uuid,text,text) from public,anon;
grant execute on function public.job_submit(uuid),public.job_submit_seeker_profile(uuid),public.job_set_status(uuid,public.job_status),public.job_set_application_status(uuid,public.job_application_status),public.job_get_employer_contact(uuid),public.job_get_seeker_contact(uuid),public.job_admin_moderate(public.business_moderation_target,uuid,text,text) to authenticated;

-- Extend the existing deletion RPC while preserving all previously returned media paths.
create or replace function public.business_delete_user_data() returns text[] language plpgsql security definer set search_path=public as $$
declare a text:=auth.jwt()->>'sub'; paths text[]; begin if a is null then raise exception 'UNAUTHORIZED'; end if;
 select coalesce(array_agg(storage_path),'{}') into paths from (select p.storage_path from business_photos p join businesses b on b.id=p.business_id where b.owner_id=a union all select p.storage_path from business_offering_photos p join business_offerings o on o.id=p.offering_id where o.owner_user_id=a union all select photo_path from job_seeker_profiles where user_id=a and photo_path is not null union all select resume_path from job_applications where applicant_id=a and resume_path is not null) x;
 delete from public.job_blocks where blocker_id=a or blocked_id=a; delete from public.job_saved where user_id=a; delete from public.job_reports where reporter_id=a or reported_user_id=a; delete from public.job_notifications where user_id=a; delete from public.job_notification_settings where user_id=a; delete from public.job_applications where applicant_id=a; delete from public.jobs where employer_id=a; delete from public.job_seeker_profiles where user_id=a; delete from public.job_employer_verification where employer_id=a;
 delete from business_offerings where owner_user_id=a; delete from businesses where owner_id=a; delete from business_offering_favorites where user_id=a; delete from business_offering_reviews where user_id=a; delete from business_offering_reports where reporter_id=a; delete from business_offering_blocks where user_id=a; delete from business_favorites where user_id=a; delete from business_reviews where user_id=a; delete from business_reports where reporter_id=a; delete from business_blocks where user_id=a; delete from business_admins where user_id=a; return paths;
end $$;
revoke all on function public.business_delete_user_data() from public,anon; grant execute on function public.business_delete_user_data() to authenticated;