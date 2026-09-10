begin;

create or replace function public.business_offering_save_draft_with_location(
  p_input jsonb,
  p_offering_id uuid default null,
  p_latitude numeric default null,
  p_longitude numeric default null
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

  result:=public.business_offering_save_draft(p_input,p_offering_id);

  update public.business_offerings
    set latitude=p_latitude,longitude=p_longitude,updated_at=now()
    where id=result.id and owner_user_id=actor
    returning * into result;

  if result.id is null then raise exception 'Product or service save failed.' using errcode='42501'; end if;
  return result;
end
$$;

revoke all on function public.business_offering_save_draft_with_location(jsonb,uuid,numeric,numeric) from public;
grant execute on function public.business_offering_save_draft_with_location(jsonb,uuid,numeric,numeric) to anon,authenticated;

commit;