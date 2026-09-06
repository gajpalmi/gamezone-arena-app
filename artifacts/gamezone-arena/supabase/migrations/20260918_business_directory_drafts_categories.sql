-- Business listings are intentionally created as private drafts. The existing
-- owner-only policies and business-media bucket policies are unchanged.
alter table public.businesses alter column status set default 'draft';

insert into public.business_categories (slug, name, description, sort_order) values
  ('grocery', 'Grocery', 'Grocers and everyday essentials', 110),
  ('electronics', 'Electronics', 'Electronics and appliance retailers', 120),
  ('clothing', 'Clothing', 'Clothing and fashion retailers', 130),
  ('restaurant-food', 'Restaurant & Food', 'Restaurants, food stalls and catering', 140),
  ('repair', 'Repair', 'Device, appliance and general repair', 150),
  ('beauty', 'Beauty', 'Beauty, salon and personal care', 160),
  ('construction', 'Construction', 'Construction and building services', 170),
  ('other', 'Other', 'Businesses not represented by another category', 999)
on conflict (slug) do nothing;