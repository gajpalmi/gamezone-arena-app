begin;

alter table public.business_offerings
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

alter table public.business_offerings
  drop constraint if exists business_offerings_latitude_check,
  drop constraint if exists business_offerings_longitude_check;

alter table public.business_offerings
  add constraint business_offerings_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint business_offerings_longitude_check
    check (longitude is null or longitude between -180 and 180);

create or replace function public.business_offering_set_location(
  p_offering_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
returns public.business_offerings
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  actor text:=nullif(btrim(auth.jwt()->>'sub'),'');
  result public.business_offerings;
begin
  if actor is null then raise exception 'Authentication is required.' using errcode='42501'; end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'Invalid latitude.' using errcode='22023'; end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'Invalid longitude.' using errcode='22023'; end if;
  update public.business_offerings
    set latitude=p_latitude,longitude=p_longitude,updated_at=now()
    where id=p_offering_id and owner_user_id=actor and status in ('draft','rejected')
    returning * into result;
  if result.id is null then raise exception 'This product or service location cannot be edited.' using errcode='42501'; end if;
  return result;
end
$$;

revoke all on function public.business_offering_set_location(uuid,numeric,numeric) from public;
grant execute on function public.business_offering_set_location(uuid,numeric,numeric) to anon,authenticated;

commit;