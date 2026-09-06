begin;

create policy "business admins read moderation photos"
on public.business_photos
for select
to authenticated
using (public.business_is_admin());

commit;