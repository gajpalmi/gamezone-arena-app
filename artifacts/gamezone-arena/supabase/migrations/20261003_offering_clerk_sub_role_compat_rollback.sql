begin;

revoke execute on function public.business_offering_prepare_photo(uuid, text),
  public.business_offering_submit(uuid),
  public.business_offering_set_enabled(uuid, boolean),
  public.business_offering_can_interact(uuid, boolean),
  public.business_offering_add_to_basket(uuid),
  public.business_offering_cancel_basket_item(uuid)
from anon;

drop policy if exists "anon buyers read only own basket" on public.business_offering_basket;
revoke select on public.business_offering_basket from anon;

drop policy if exists "anon users delete own offering blocks" on public.business_offering_blocks;
drop policy if exists "anon users add safe offering blocks" on public.business_offering_blocks;
drop policy if exists "anon users read own offering blocks" on public.business_offering_blocks;
drop policy if exists "anon users insert offering reports" on public.business_offering_reports;
drop policy if exists "anon users delete own offering reviews" on public.business_offering_reviews;
drop policy if exists "anon users update own offering reviews" on public.business_offering_reviews;
drop policy if exists "anon users add safe offering reviews" on public.business_offering_reviews;
drop policy if exists "anon users read allowed offering reviews" on public.business_offering_reviews;
drop policy if exists "anon users delete own offering favorites" on public.business_offering_favorites;
drop policy if exists "anon users add safe offering favorites" on public.business_offering_favorites;
drop policy if exists "anon users read own offering favorites" on public.business_offering_favorites;

drop policy "anon owners delete offering media" on storage.objects;
drop policy "anon owners read offering media" on storage.objects;
drop policy "anon owners upload offering media" on storage.objects;

drop policy "anon owners delete offering photos" on public.business_offering_photos;
drop policy "anon owners insert offering photos" on public.business_offering_photos;
drop policy "anon owners read offering photos" on public.business_offering_photos;

drop policy "anon owners delete own offerings" on public.business_offerings;
drop policy "anon owners read own offerings" on public.business_offerings;

revoke execute on function public.business_offering_actor_can_manage(uuid),
  public.business_offering_actor_owns_photo(uuid),
  public.business_offering_actor_can_manage_photo(uuid),
  public.business_offering_actor_can_read_media(text),
  public.business_offering_actor_can_delete_media(text)
from anon;

drop function public.business_offering_actor_can_delete_media(text);
drop function public.business_offering_actor_can_read_media(text);
drop function public.business_offering_actor_can_manage_photo(uuid);
drop function public.business_offering_actor_owns_photo(uuid);
drop function public.business_offering_actor_can_manage(uuid);

commit;