begin;

create extension if not exists pgcrypto;

create type public.business_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type public.business_report_reason as enum ('spam', 'fraud', 'inappropriate_content', 'harassment', 'incorrect_information', 'other');
create type public.business_moderation_target as enum ('business', 'review', 'photo', 'report');

create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default (auth.jwt() ->> 'sub'),
  category_id uuid not null references public.business_categories(id),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 254),
  website text check (char_length(website) <= 2048),
  address text check (char_length(address) <= 500),
  city text check (char_length(city) <= 120),
  latitude numeric(9,6),
  longitude numeric(9,6),
  status public.business_status not null default 'pending',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  check ((is_closed and opens_at is null and closes_at is null) or (not is_closed and opens_at is not null and closes_at is not null and opens_at < closes_at)),
  unique (business_id, day_of_week)
);

create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[^/]+/[^/]+/.+$'),
  alt_text text check (char_length(alt_text) <= 240),
  sort_order integer not null default 0,
  created_by text not null default (auth.jwt() ->> 'sub'),
  created_at timestamptz not null default now()
);

create table public.business_favorites (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'),
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 2000),
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.business_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null default (auth.jwt() ->> 'sub'),
  business_id uuid references public.businesses(id) on delete cascade,
  review_id uuid references public.business_reviews(id) on delete cascade,
  reason public.business_report_reason not null,
  details text check (char_length(details) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  check (num_nonnulls(business_id, review_id) = 1)
);

create table public.business_blocks (
  user_id text not null default (auth.jwt() ->> 'sub'),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table public.business_verification (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  submitted_by text not null default (auth.jwt() ->> 'sub'),
  status public.business_status not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text check (char_length(notes) <= 2000),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.business_admins (
  user_id text primary key,
  granted_by text,
  created_at timestamptz not null default now()
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  target_type public.business_moderation_target not null,
  target_id uuid not null,
  action text not null check (char_length(action) between 2 and 80),
  reason text check (char_length(reason) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index businesses_public_browse_idx on public.businesses (category_id, city, created_at desc) where status = 'approved';
create index businesses_owner_idx on public.businesses (owner_id, updated_at desc);
create index business_photos_business_idx on public.business_photos (business_id, sort_order);
create index business_reviews_business_idx on public.business_reviews (business_id, created_at desc) where is_approved;
create index business_reports_open_idx on public.business_reports (created_at) where resolved_at is null;
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id, created_at desc);

alter table public.business_categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_photos enable row level security;
alter table public.business_favorites enable row level security;
alter table public.business_reviews enable row level security;
alter table public.business_reports enable row level security;
alter table public.business_blocks enable row level security;
alter table public.business_verification enable row level security;
alter table public.business_admins enable row level security;
alter table public.moderation_actions enable row level security;

create policy "active business categories are readable" on public.business_categories for select using (is_active);
create policy "approved businesses are readable" on public.businesses for select using (status = 'approved' or owner_id = auth.jwt() ->> 'sub');
create policy "business admins read moderation businesses" on public.businesses for select using (exists (select 1 from public.business_admins a where a.user_id = auth.jwt() ->> 'sub'));
create policy "users create their businesses" on public.businesses for insert with check (owner_id = auth.jwt() ->> 'sub' and status in ('draft', 'pending'));
create policy "owners update unapproved businesses" on public.businesses for update using (owner_id = auth.jwt() ->> 'sub' and status in ('draft', 'pending', 'rejected')) with check (owner_id = auth.jwt() ->> 'sub' and status in ('draft', 'pending'));
create policy "owners delete unapproved businesses" on public.businesses for delete using (owner_id = auth.jwt() ->> 'sub' and status in ('draft', 'pending', 'rejected'));
create policy "hours follow readable business" on public.business_hours for select using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'approved' or b.owner_id = auth.jwt() ->> 'sub')));
create policy "owners manage business hours" on public.business_hours for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.jwt() ->> 'sub' and b.status <> 'approved')) with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.jwt() ->> 'sub' and b.status <> 'approved'));
create policy "photos follow readable business" on public.business_photos for select using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'approved' or b.owner_id = auth.jwt() ->> 'sub')));
create policy "owners manage photos" on public.business_photos for all using (created_by = auth.jwt() ->> 'sub' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.jwt() ->> 'sub' and b.status <> 'approved')) with check (created_by = auth.jwt() ->> 'sub' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.jwt() ->> 'sub' and b.status <> 'approved'));
create policy "users manage own favorites" on public.business_favorites for all using (user_id = auth.jwt() ->> 'sub') with check (user_id = auth.jwt() ->> 'sub');
create policy "approved reviews are readable" on public.business_reviews for select using (is_approved or user_id = auth.jwt() ->> 'sub');
create policy "users create own reviews" on public.business_reviews for insert with check (user_id = auth.jwt() ->> 'sub' and is_approved and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved'));
create policy "users update own visible reviews" on public.business_reviews for update using (user_id = auth.jwt() ->> 'sub' and is_approved) with check (user_id = auth.jwt() ->> 'sub' and is_approved);
create policy "users delete own reviews" on public.business_reviews for delete using (user_id = auth.jwt() ->> 'sub');
create policy "users create and view own reports" on public.business_reports for select using (reporter_id = auth.jwt() ->> 'sub');
create policy "business admins read reports" on public.business_reports for select using (exists (select 1 from public.business_admins a where a.user_id = auth.jwt() ->> 'sub'));
create policy "users create own reports" on public.business_reports for insert with check (reporter_id = auth.jwt() ->> 'sub');
create policy "users manage own blocks" on public.business_blocks for all using (user_id = auth.jwt() ->> 'sub') with check (user_id = auth.jwt() ->> 'sub');
create policy "owners see own verification" on public.business_verification for select using (submitted_by = auth.jwt() ->> 'sub');
create policy "owners request verification" on public.business_verification for insert with check (submitted_by = auth.jwt() ->> 'sub' and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.jwt() ->> 'sub'));
create policy "admins see own membership" on public.business_admins for select using (user_id = auth.jwt() ->> 'sub');
create policy "admins read moderation log" on public.moderation_actions for select using (exists (select 1 from public.business_admins a where a.user_id = auth.jwt() ->> 'sub'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "business media owner uploads" on storage.objects for insert to authenticated with check (bucket_id = 'business-media' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub') and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp'));
create policy "business media owner updates" on storage.objects for update to authenticated using (bucket_id = 'business-media' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')) with check (bucket_id = 'business-media' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
create policy "business media owner deletes" on storage.objects for delete to authenticated using (bucket_id = 'business-media' and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));

create or replace function public.business_submit(p_business_id uuid) returns public.businesses language plpgsql security definer set search_path = public as $$
declare v_business public.businesses%rowtype; v_actor text := auth.jwt() ->> 'sub';
begin
  select * into v_business from public.businesses where id = p_business_id for update;
  if v_actor is null or not found or v_business.owner_id <> v_actor then raise exception 'BUSINESS_NOT_OWNER'; end if;
  if v_business.status not in ('draft', 'rejected', 'pending') then raise exception 'BUSINESS_NOT_SUBMITTABLE'; end if;
  update public.businesses set status = 'pending', submitted_at = now(), rejection_reason = null, updated_at = now() where id = p_business_id returning * into v_business;
  return v_business;
end; $$;

create or replace function public.business_admin_moderate(p_target_type public.business_moderation_target, p_target_id uuid, p_action text, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'sub'; v_owner text;
begin
  if v_actor is null or not exists (select 1 from public.business_admins where user_id = v_actor) then raise exception 'BUSINESS_ADMIN_REQUIRED'; end if;
  if p_target_type = 'business' then
    select owner_id into v_owner from public.businesses where id = p_target_id for update;
    if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;
    if p_action = 'approve' then
      if v_owner = v_actor then raise exception 'BUSINESS_SELF_APPROVAL_FORBIDDEN'; end if;
      update public.businesses set status = 'approved', approved_at = now(), approved_by = v_actor, rejection_reason = null, updated_at = now() where id = p_target_id;
    elsif p_action = 'reject' then update public.businesses set status = 'rejected', rejection_reason = left(coalesce(p_reason, ''), 1000), updated_at = now() where id = p_target_id;
    elsif p_action = 'suspend' then update public.businesses set status = 'suspended', updated_at = now() where id = p_target_id;
    else raise exception 'BUSINESS_INVALID_ACTION'; end if;
  elsif p_target_type = 'review' then
    if p_action = 'hide' then update public.business_reviews set is_approved = false, updated_at = now() where id = p_target_id;
    elsif p_action = 'restore' then update public.business_reviews set is_approved = true, updated_at = now() where id = p_target_id;
    else raise exception 'BUSINESS_INVALID_ACTION'; end if;
    if not found then raise exception 'BUSINESS_REVIEW_NOT_FOUND'; end if;
  elsif p_target_type = 'report' and p_action = 'resolve' then
    update public.business_reports set resolved_at = now(), resolved_by = v_actor where id = p_target_id;
    if not found then raise exception 'BUSINESS_REPORT_NOT_FOUND'; end if;
  else raise exception 'BUSINESS_INVALID_ACTION'; end if;
  insert into public.moderation_actions (admin_id, target_type, target_id, action, reason) values (v_actor, p_target_type, p_target_id, p_action, left(p_reason, 2000));
end; $$;

revoke all on function public.business_submit(uuid) from public;
grant execute on function public.business_submit(uuid) to authenticated;
revoke all on function public.business_admin_moderate(public.business_moderation_target, uuid, text, text) from public;
grant execute on function public.business_admin_moderate(public.business_moderation_target, uuid, text, text) to authenticated;

create or replace function public.business_delete_user_data() returns void language plpgsql security definer set search_path = public as $$
declare v_actor text := auth.jwt() ->> 'sub';
begin
  if v_actor is null then raise exception 'UNAUTHORIZED'; end if;
  delete from public.businesses where owner_id = v_actor;
  delete from public.business_favorites where user_id = v_actor;
  delete from public.business_reviews where user_id = v_actor;
  delete from public.business_reports where reporter_id = v_actor;
  delete from public.business_blocks where user_id = v_actor;
  delete from public.business_admins where user_id = v_actor;
  -- Photos delete automatically via cascading foreign keys if business is deleted.
  -- Otherwise, if user created photos for other businesses, they remain but created_by could be nulled if we cared, 
  -- but business_photos delete cascade on businesses(id) is enough.
end; $$;

grant execute on function public.business_delete_user_data() to authenticated;

insert into public.business_categories (slug, name, description, sort_order) values
('restaurants', 'Restaurants', 'Food and dining establishments', 10),
('cafes', 'Cafes & Bakeries', 'Coffee shops, bakeries and casual dining', 20),
('health-wellness', 'Health & Wellness', 'Clinics, fitness and wellness services', 30),
('home-services', 'Home Services', 'Repair, maintenance and home improvement', 40),
('automotive', 'Automotive', 'Vehicle repair and automotive services', 50),
('beauty-personal-care', 'Beauty & Personal Care', 'Salon and personal care services', 60),
('professional-services', 'Professional Services', 'Legal, accounting and business services', 70),
('retail', 'Retail', 'Local shops and specialty retail', 80),
('education', 'Education & Training', 'Tutoring, classes and training providers', 90),
('arts-entertainment', 'Arts & Entertainment', 'Creative, cultural and entertainment venues', 100)
on conflict (slug) do nothing;

commit;