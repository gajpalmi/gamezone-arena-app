create table public.business_offering_basket (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.business_offerings(id) on delete cascade,
  buyer_id text not null default (auth.jwt() ->> 'sub'),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offering_id, buyer_id)
);

create index business_offering_basket_buyer_idx
  on public.business_offering_basket(buyer_id, status, created_at desc);

alter table public.business_offering_basket enable row level security;

create policy "buyer reads only own basket"
  on public.business_offering_basket
  for select
  to authenticated
  using (buyer_id = auth.jwt() ->> 'sub');

create or replace function public.business_offering_add_to_basket(p_offering_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := auth.jwt() ->> 'sub';
  offering public.business_offerings%rowtype;
  basket_id uuid;
begin
  if actor is null then raise exception 'UNAUTHORIZED'; end if;
  select * into offering
  from public.business_offerings
  where id = p_offering_id
    and kind = 'product'
    and listing_intent = 'sell'
    and status = 'approved'
    and is_enabled;
  if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
  if offering.owner_user_id = actor then raise exception 'CANNOT_BUY_OWN_PRODUCT'; end if;

  insert into public.business_offering_basket(offering_id, buyer_id, status)
  values (p_offering_id, actor, 'active')
  on conflict (offering_id, buyer_id)
  do update set status = 'active', updated_at = now()
  returning id into basket_id;
  return basket_id;
end;
$$;

create or replace function public.business_offering_cancel_basket_item(p_basket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare actor text := auth.jwt() ->> 'sub';
begin
  if actor is null then raise exception 'UNAUTHORIZED'; end if;
  update public.business_offering_basket
  set status = 'cancelled', updated_at = now()
  where id = p_basket_id and buyer_id = actor and status = 'active';
  if not found then raise exception 'BASKET_ITEM_NOT_FOUND'; end if;
end;
$$;

revoke all on table public.business_offering_basket from public, anon, authenticated;
grant select on table public.business_offering_basket to authenticated;
revoke all on function public.business_offering_add_to_basket(uuid),
  public.business_offering_cancel_basket_item(uuid) from public, anon;
grant execute on function public.business_offering_add_to_basket(uuid),
  public.business_offering_cancel_basket_item(uuid) to authenticated;