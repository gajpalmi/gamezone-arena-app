-- Additive taxonomy for products and services.  Text values remain on existing
-- listings so historic data and the current moderation/RLS model are preserved.
create table if not exists public.offering_categories (
  id uuid primary key default gen_random_uuid(),
  kind public.business_offering_kind not null,
  slug text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  parent_id uuid references public.offering_categories(id) on delete restrict,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(kind, slug)
);
create index if not exists offering_categories_lookup_idx
  on public.offering_categories(kind, parent_id, sort_order, name) where is_active;

alter table public.business_offerings
  add column if not exists subcategory text check (subcategory is null or char_length(trim(subcategory)) <= 120);
create index if not exists business_offerings_subcategory_idx
  on public.business_offerings(kind, category, subcategory) where status = 'approved' and is_enabled;

alter table public.offering_categories enable row level security;
drop policy if exists "active offering categories readable" on public.offering_categories;
create policy "active offering categories readable" on public.offering_categories
  for select to authenticated using (is_active or public.business_is_admin());

insert into public.offering_categories(kind,slug,name,sort_order) values
 ('product','grocery','Grocery',10),('product','electronics','Electronics',20),
 ('product','mobile','Mobile',30),('product','clothing','Clothing',40),
 ('product','furniture','Furniture',50),('product','home-kitchen','Home & Kitchen',60),
 ('product','automotive','Automotive',70),('product','tools','Tools',80),('product','other','Other',999),
 ('service','electrician','Electrician',10),('service','plumber','Plumber',20),
 ('service','carpenter','Carpenter',30),('service','mechanic','Mechanic',40),
 ('service','cleaning','Cleaning',50),('service','repair','Repair',60),
 ('service','tutor','Tutor',70),('service','beauty','Beauty',80),
 ('service','delivery','Delivery',90),('service','construction','Construction',100),('service','other','Other',999)
on conflict(kind,slug) do update set name=excluded.name,sort_order=excluded.sort_order,is_active=true;

insert into public.offering_categories(kind,slug,name,parent_id,sort_order)
select c.kind, v.slug, v.name, c.id, v.sort_order
from public.offering_categories c
join (values
 ('electronics','phones','Phones & Accessories',10),('electronics','computers','Computers',20),
 ('clothing','men','Men''s Clothing',10),('clothing','women','Women''s Clothing',20),
 ('grocery','fresh','Fresh & Packaged Food',10),('furniture','home','Home Furniture',10),
 ('electrician','wiring','Wiring & Installation',10),('plumber','repairs','Repairs & Fittings',10),
 ('repair','appliances','Appliance Repair',10),('tutor','academic','Academic Tutoring',10),
 ('beauty','salon','Salon & Grooming',10),('construction','contractor','Contractor Services',10)
) as v(parent_slug,slug,name,sort_order) on c.slug=v.parent_slug and c.parent_id is null
on conflict(kind,slug) do update set name=excluded.name, parent_id=excluded.parent_id, sort_order=excluded.sort_order,is_active=true;