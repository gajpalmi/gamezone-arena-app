-- Rollback-only integration checks. Safe for an already-migrated project.

do $$
declare
  deletion_definition text:=pg_get_functiondef('public.business_delete_user_data_unlocked()'::regprocedure);
  anonymization_definition text:=pg_get_functiondef('public.account_deletion_anonymize_audit_links()'::regprocedure);
begin
  if position('job.employer_id=actor' in deletion_definition)=0 then
    raise exception 'Employer-owned job resumes are missing from the manifest.';
  end if;
  if position('business_verification set reviewed_by=null' in anonymization_definition)=0
    or position('job_employer_verification set reviewed_by=null' in anonymization_definition)=0
    or position('business_admins set granted_by=null' in anonymization_definition)=0 then
    raise exception 'Reviewer or granter identifiers are not anonymized.';
  end if;
  if (
    select count(*) from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and policyname in (
        'terminal account cannot upload media',
        'terminal account cannot update media'
      )
      and permissive='RESTRICTIVE'
  )<>2 then
    raise exception 'Terminal Storage write policies are missing.';
  end if;
end
$$;

-- Pending state survives retry and blocks new database writes.
begin;
select set_config('request.jwt.claims','{"sub":"terminal-deletion-test"}',true);
select public.business_delete_user_data();
do $$
begin
  if public.account_deletion_write_allowed() then
    raise exception 'Pending deletion still permits writes.';
  end if;
  begin
    insert into public.ludo_rooms(room_code) values('DELTERM1');
    raise exception 'Pending deletion inserted a Ludo row.';
  exception when sqlstate '55000' then null;
  end;
  if cardinality(public.business_delete_user_data())<>0 then
    raise exception 'Retry returned an unexpected manifest.';
  end if;
end
$$;
rollback;

-- Current Business legal versions save and submit without weakening the
-- existing terms or listing-rules versions.
begin;
select set_config('request.jwt.claims','{"sub":"business-submit-version-test"}',true);
do $$
declare
  category uuid;
  business_id uuid;
begin
  select id into category from public.business_categories order by sort_order,id limit 1;
  if category is null then raise exception 'Business category fixture is unavailable.'; end if;
  insert into public.businesses(
    owner_id,category_id,name,description,phone,city,
    public_contact_consent_at,
    terms_version,terms_accepted_at,
    privacy_version,privacy_accepted_at,
    listing_rules_version,listing_rules_accepted_at,
    status
  ) values(
    'business-submit-version-test',category,'Release Test Business','Version integration test',
    '+919999999999','Test City',now(),
    '2026-09-06',now(),
    '2026-09-10',now(),
    '2026-09-06',now(),
    'draft'
  ) returning id into business_id;
  perform public.business_submit(business_id);
  if not exists(
    select 1 from public.businesses
    where id=business_id and status='pending' and privacy_version='2026-09-10'
  ) then
    raise exception 'Business did not submit with current legal versions.';
  end if;
end
$$;
rollback;

-- Storage acknowledgment is rejected until matching metadata is absent.
begin;
select set_config('request.jwt.claims','{"sub":"verified-ack-test"}',true);
insert into public.account_deletion_requests(owner_user_id,media_paths)
values(
  'verified-ack-test',
  array['offerings/verified-ack-test/00000000-0000-0000-0000-000000000000/photo.jpg']
);
insert into storage.objects(bucket_id,name)
values(
  'business-media',
  'offerings/verified-ack-test/00000000-0000-0000-0000-000000000000/photo.jpg'
);
do $$
begin
  begin
    perform public.business_acknowledge_deleted_media(
      array['offerings/verified-ack-test/00000000-0000-0000-0000-000000000000/photo.jpg']
    );
    raise exception 'Existing Storage object was acknowledged.';
  exception when sqlstate '55000' then null;
  end;
end
$$;
rollback;

-- Finalization removes the raw subject and creates a hashed tombstone. If
-- Clerk deletion then fails, the backend retry remains idempotent while writes
-- stay blocked, allowing the client to reach Clerk deletion again.
begin;
select set_config('request.jwt.claims','{"sub":"terminal-finalize-test"}',true);
select public.business_delete_user_data();
select public.business_finalize_user_deletion();
do $$
begin
  if exists(
    select 1 from public.account_deletion_requests
    where owner_user_id='terminal-finalize-test'
  ) then
    raise exception 'Raw deletion subject remains after finalization.';
  end if;
  if not exists(
    select 1 from public.account_deletion_tombstones
    where owner_hash=public.account_deletion_actor_hash('terminal-finalize-test')
  ) then
    raise exception 'Finalized deletion tombstone is missing.';
  end if;
  if public.account_deletion_write_allowed() then
    raise exception 'Finalized account still permits writes.';
  end if;
  if cardinality(public.business_delete_user_data())<>0 then
    raise exception 'Finalized deletion retry was not already-clean.';
  end if;
  perform public.business_finalize_user_deletion();
end
$$;
rollback;