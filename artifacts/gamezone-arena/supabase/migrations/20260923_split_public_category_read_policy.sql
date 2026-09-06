-- Avoid invoking the authenticated-only admin helper for anonymous readers.
drop policy if exists "active offering categories readable" on public.offering_categories;
drop policy if exists "anonymous active offering categories readable" on public.offering_categories;
drop policy if exists "authenticated offering categories readable" on public.offering_categories;

create policy "anonymous active offering categories readable"
  on public.offering_categories for select to anon
  using (is_active);

create policy "authenticated offering categories readable"
  on public.offering_categories for select to authenticated
  using (is_active or public.business_is_admin());