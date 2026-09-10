begin;

-- Clerk third-party session tokens can contain a valid subject without carrying
-- Supabase's "authenticated" role claim. This RPC remains safe when callable by
-- anon because it rejects requests without a verified JWT subject and derives
-- ownership exclusively from that subject.
create or replace function public.business_offering_save_draft(
  p_input jsonb,
  p_offering_id uuid default null
)
returns public.business_offerings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text := auth.jwt() ->> 'sub';
  target public.business_offerings;
  linked_business_id uuid;
  linked_business_text text;
begin
  if actor is null or btrim(actor) = '' then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_input is null
    or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception 'Invalid offering input.'
      using errcode = '22023';
  end if;

  linked_business_text := nullif(btrim(p_input ->> 'business_id'), '');
  if linked_business_text is not null then
    begin
      linked_business_id := linked_business_text::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Invalid business selection.'
          using errcode = '22023';
    end;
  end if;

  if linked_business_id is not null and not exists (
    select 1
    from public.businesses b
    where b.id = linked_business_id
      and b.owner_id = actor
  ) then
    raise exception 'The selected business is not owned by the signed-in user.'
      using errcode = '42501';
  end if;

  if p_offering_id is null then
    insert into public.business_offerings (
      owner_user_id,
      business_id,
      kind,
      listing_intent,
      name,
      category,
      subcategory,
      description,
      price,
      price_unit,
      in_stock,
      city,
      area,
      location_text,
      service_area,
      contact_phone,
      whatsapp,
      delivery_info,
      availability_hours,
      is_enabled,
      contact_public_consent_at,
      terms_version,
      terms_accepted_at,
      status
    )
    values (
      actor,
      linked_business_id,
      (p_input ->> 'kind')::public.business_offering_kind,
      coalesce(nullif(p_input ->> 'listing_intent', ''), 'sell'),
      btrim(p_input ->> 'name'),
      btrim(p_input ->> 'category'),
      nullif(btrim(p_input ->> 'subcategory'), ''),
      coalesce(p_input ->> 'description', ''),
      nullif(p_input ->> 'price', '')::numeric,
      coalesce(nullif(btrim(p_input ->> 'price_unit'), ''), 'per item'),
      coalesce((p_input ->> 'in_stock')::boolean, true),
      btrim(p_input ->> 'city'),
      nullif(btrim(p_input ->> 'area'), ''),
      nullif(btrim(p_input ->> 'location_text'), ''),
      nullif(btrim(p_input ->> 'service_area'), ''),
      btrim(p_input ->> 'contact_phone'),
      nullif(btrim(p_input ->> 'whatsapp'), ''),
      nullif(btrim(p_input ->> 'delivery_info'), ''),
      nullif(btrim(p_input ->> 'availability_hours'), ''),
      coalesce((p_input ->> 'is_enabled')::boolean, true),
      nullif(p_input ->> 'contact_public_consent_at', '')::timestamptz,
      nullif(btrim(p_input ->> 'terms_version'), ''),
      nullif(p_input ->> 'terms_accepted_at', '')::timestamptz,
      'draft'
    )
    returning * into target;
  else
    select *
    into target
    from public.business_offerings o
    where o.id = p_offering_id
    for update;

    if target.id is null
      or target.owner_user_id <> actor
      or target.status not in ('draft', 'rejected') then
      raise exception 'This product or service cannot be edited.'
        using errcode = '42501';
    end if;

    update public.business_offerings
    set business_id = linked_business_id,
        kind = (p_input ->> 'kind')::public.business_offering_kind,
        listing_intent = coalesce(nullif(p_input ->> 'listing_intent', ''), 'sell'),
        name = btrim(p_input ->> 'name'),
        category = btrim(p_input ->> 'category'),
        subcategory = nullif(btrim(p_input ->> 'subcategory'), ''),
        description = coalesce(p_input ->> 'description', ''),
        price = nullif(p_input ->> 'price', '')::numeric,
        price_unit = coalesce(nullif(btrim(p_input ->> 'price_unit'), ''), 'per item'),
        in_stock = coalesce((p_input ->> 'in_stock')::boolean, true),
        city = btrim(p_input ->> 'city'),
        area = nullif(btrim(p_input ->> 'area'), ''),
        location_text = nullif(btrim(p_input ->> 'location_text'), ''),
        service_area = nullif(btrim(p_input ->> 'service_area'), ''),
        contact_phone = btrim(p_input ->> 'contact_phone'),
        whatsapp = nullif(btrim(p_input ->> 'whatsapp'), ''),
        delivery_info = nullif(btrim(p_input ->> 'delivery_info'), ''),
        availability_hours = nullif(btrim(p_input ->> 'availability_hours'), ''),
        is_enabled = coalesce((p_input ->> 'is_enabled')::boolean, true),
        contact_public_consent_at = nullif(p_input ->> 'contact_public_consent_at', '')::timestamptz,
        terms_version = nullif(btrim(p_input ->> 'terms_version'), ''),
        terms_accepted_at = nullif(p_input ->> 'terms_accepted_at', '')::timestamptz,
        updated_at = now()
    where id = p_offering_id
    returning * into target;
  end if;

  return target;
end;
$$;

revoke all on function public.business_offering_save_draft(jsonb, uuid)
  from public;
grant execute on function public.business_offering_save_draft(jsonb, uuid)
  to anon, authenticated;

commit;