-- Break the offerings <-> interaction-table RLS dependency cycle.
create or replace function public.business_offering_can_interact(
  p_offering_id uuid,
  p_disallow_owner boolean default false
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.business_offerings o
    where o.id=p_offering_id
      and o.status='approved'
      and o.is_enabled
      and (not p_disallow_owner or o.owner_user_id<>auth.jwt()->>'sub')
  );
$$;
revoke all on function public.business_offering_can_interact(uuid,boolean) from public, anon;
grant execute on function public.business_offering_can_interact(uuid,boolean) to authenticated;

drop policy if exists "offering favorites safe manage" on public.business_offering_favorites;
create policy "users read own offering favorites"
on public.business_offering_favorites for select to authenticated
using(user_id=auth.jwt()->>'sub');
create policy "users add safe offering favorites"
on public.business_offering_favorites for insert to authenticated
with check(
  user_id=auth.jwt()->>'sub'
  and public.business_offering_can_interact(offering_id,true)
);
create policy "users delete own offering favorites"
on public.business_offering_favorites for delete to authenticated
using(user_id=auth.jwt()->>'sub');

drop policy if exists "offering reviews readable" on public.business_offering_reviews;
drop policy if exists "offering reviews safe manage" on public.business_offering_reviews;
create policy "offering reviews visible to allowed readers"
on public.business_offering_reviews for select to authenticated
using(
  (is_approved and public.business_offering_can_interact(offering_id,false))
  or user_id=auth.jwt()->>'sub'
  or public.business_is_admin()
);
create policy "users add safe offering reviews"
on public.business_offering_reviews for insert to authenticated
with check(
  user_id=auth.jwt()->>'sub'
  and is_approved
  and public.business_offering_can_interact(offering_id,true)
);
create policy "users update own offering reviews"
on public.business_offering_reviews for update to authenticated
using(user_id=auth.jwt()->>'sub')
with check(
  user_id=auth.jwt()->>'sub'
  and is_approved
  and public.business_offering_can_interact(offering_id,true)
);
create policy "users delete own offering reviews"
on public.business_offering_reviews for delete to authenticated
using(user_id=auth.jwt()->>'sub');

drop policy if exists "offering blocks safe manage" on public.business_offering_blocks;
create policy "users read own offering blocks"
on public.business_offering_blocks for select to authenticated
using(user_id=auth.jwt()->>'sub');
create policy "users add safe offering blocks"
on public.business_offering_blocks for insert to authenticated
with check(
  user_id=auth.jwt()->>'sub'
  and public.business_offering_can_interact(offering_id,false)
);
create policy "users delete own offering blocks"
on public.business_offering_blocks for delete to authenticated
using(user_id=auth.jwt()->>'sub');