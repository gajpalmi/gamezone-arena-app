begin;

create table public.account_deletion_tombstones (
  owner_hash text primary key check (owner_hash ~ '^[0-9a-f]{64}$'),
  completed_at timestamptz not null default now()
);
alter table public.account_deletion_tombstones enable row level security;
revoke all on public.account_deletion_tombstones from public,anon,authenticated;

create function public.account_deletion_actor_hash(p_actor text)
returns text
language sql
immutable
security definer
set search_path=public,extensions,pg_temp
as $$
  select encode(extensions.digest(convert_to(p_actor,'UTF8'),'sha256'),'hex');
$$;

create function public.account_deletion_write_allowed()
returns boolean
language plpgsql
volatile
security definer
set search_path=public,pg_temp
as $$
declare actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
begin
  if actor is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor,246813579));
  return not exists(
      select 1 from public.account_deletion_requests where owner_user_id=actor
    )
    and not exists(
      select 1 from public.account_deletion_tombstones
      where owner_hash=public.account_deletion_actor_hash(actor)
    );
end
$$;

create function public.account_deletion_reject_pending_write()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
begin
  if actor is null or pg_trigger_depth()>1 then return new; end if;
  if not public.account_deletion_write_allowed() then
    raise exception 'Account deletion is already in progress or complete.'
      using errcode='55000';
  end if;
  return new;
end
$$;

revoke all on function public.account_deletion_actor_hash(text),
  public.account_deletion_write_allowed(),
  public.account_deletion_reject_pending_write()
from public;
grant execute on function public.account_deletion_write_allowed() to anon,authenticated;

do $$
declare target record;
begin
  for target in
    select schemaname,tablename
    from pg_tables
    where schemaname='public'
      and (
        tablename like 'business%'
        or tablename like 'job%'
        or tablename='jobs'
        or tablename like 'employer%'
        or tablename like 'ludo%'
        or tablename='moderation_actions'
      )
      and tablename not in ('account_deletion_requests','account_deletion_tombstones')
  loop
    execute format(
      'drop trigger if exists account_deletion_blocks_write on %I.%I',
      target.schemaname,target.tablename
    );
    execute format(
      'create trigger account_deletion_blocks_write before insert or update on %I.%I for each row execute function public.account_deletion_reject_pending_write()',
      target.schemaname,target.tablename
    );
  end loop;
end
$$;

drop policy if exists "terminal account cannot upload media" on storage.objects;
create policy "terminal account cannot upload media"
on storage.objects as restrictive for insert to anon,authenticated
with check (public.account_deletion_write_allowed());

drop policy if exists "terminal account cannot update media" on storage.objects;
create policy "terminal account cannot update media"
on storage.objects as restrictive for update to anon,authenticated
using (public.account_deletion_write_allowed())
with check (public.account_deletion_write_allowed());

alter function public.business_delete_user_data()
rename to business_delete_user_data_unlocked;
revoke all on function public.business_delete_user_data_unlocked()
from public,anon,authenticated;

create function public.business_delete_user_data()
returns text[]
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor,246813579));
  if exists(
    select 1 from public.account_deletion_tombstones
    where owner_hash=public.account_deletion_actor_hash(actor)
  ) then
    raise exception 'Account deletion is already complete.' using errcode='55000';
  end if;
  return public.business_delete_user_data_unlocked();
end
$$;

alter function public.business_finalize_user_deletion()
rename to business_finalize_user_deletion_unlocked;
revoke all on function public.business_finalize_user_deletion_unlocked()
from public,anon,authenticated;

create function public.business_finalize_user_deletion()
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor,246813579));
  perform public.business_finalize_user_deletion_unlocked();
  insert into public.account_deletion_tombstones(owner_hash)
  values(public.account_deletion_actor_hash(actor))
  on conflict(owner_hash) do nothing;
end
$$;

create or replace function public.account_deletion_anonymize_audit_links()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.businesses set approved_by=null where approved_by=new.owner_user_id;
  update public.business_offerings set approved_by=null where approved_by=new.owner_user_id;
  update public.business_reports set resolved_by=null where resolved_by=new.owner_user_id;
  update public.business_offering_reports set resolved_by=null where resolved_by=new.owner_user_id;
  update public.business_verification set reviewed_by=null where reviewed_by=new.owner_user_id;
  update public.business_admins set granted_by=null where granted_by=new.owner_user_id;
  update public.jobs set approved_by=null where approved_by=new.owner_user_id;
  update public.job_seeker_profiles set approved_by=null where approved_by=new.owner_user_id;
  update public.job_reports set resolved_by=null where resolved_by=new.owner_user_id;
  update public.job_employer_verification set reviewed_by=null where reviewed_by=new.owner_user_id;
  update public.moderation_actions set admin_id='deleted-user'
    where admin_id=new.owner_user_id;
  return new;
end
$$;

revoke all on function public.business_delete_user_data(),
  public.business_finalize_user_deletion()
from public;
grant execute on function public.business_delete_user_data(),
  public.business_finalize_user_deletion()
to anon,authenticated;

commit;