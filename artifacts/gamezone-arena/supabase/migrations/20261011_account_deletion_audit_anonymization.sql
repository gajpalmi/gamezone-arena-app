begin;

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
  update public.jobs set approved_by=null where approved_by=new.owner_user_id;
  update public.job_seeker_profiles set approved_by=null where approved_by=new.owner_user_id;
  update public.job_reports set resolved_by=null where resolved_by=new.owner_user_id;
  update public.moderation_actions
    set admin_id='deleted-user'
    where admin_id=new.owner_user_id;
  return new;
end
$$;

revoke all on function public.account_deletion_anonymize_audit_links() from public;

drop trigger if exists account_deletion_anonymize_audit_links
on public.account_deletion_requests;
create trigger account_deletion_anonymize_audit_links
after insert on public.account_deletion_requests
for each row execute function public.account_deletion_anonymize_audit_links();

commit;