-- Active taxonomy is non-sensitive reference data used before and after sign-in.
-- Mutations remain migration/admin-only because no insert/update/delete policies exist.
drop policy if exists "active offering categories readable" on public.offering_categories;
create policy "active offering categories readable"
  on public.offering_categories for select to anon, authenticated
  using (is_active or public.business_is_admin());

drop policy if exists "active job categories readable" on public.job_categories;
create policy "active job categories readable"
  on public.job_categories for select to anon, authenticated
  using (is_active);