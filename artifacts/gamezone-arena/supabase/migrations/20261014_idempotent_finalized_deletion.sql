begin;

create or replace function public.business_delete_user_data()
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
    return '{}';
  end if;
  return public.business_delete_user_data_unlocked();
end
$$;

create or replace function public.business_finalize_user_deletion()
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
  if exists(
    select 1 from public.account_deletion_tombstones
    where owner_hash=public.account_deletion_actor_hash(actor)
  ) then
    return;
  end if;
  perform public.business_finalize_user_deletion_unlocked();
  insert into public.account_deletion_tombstones(owner_hash)
  values(public.account_deletion_actor_hash(actor))
  on conflict(owner_hash) do nothing;
end
$$;

revoke all on function public.business_delete_user_data(),
  public.business_finalize_user_deletion()
from public;
grant execute on function public.business_delete_user_data(),
  public.business_finalize_user_deletion()
to anon,authenticated;

commit;