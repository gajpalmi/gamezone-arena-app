-- Products and services deliberately share the business moderation lifecycle.
alter table public.businesses
  add column if not exists owner_display_name text check (owner_display_name is null or char_length(trim(owner_display_name)) between 2 and 120),
  add column if not exists subcategory text check (subcategory is null or char_length(subcategory) <= 120),
  add column if not exists public_contact_consent_at timestamptz,
  add column if not exists services_offered text[] not null default '{}'::text[] check (cardinality(services_offered) <= 30),
  add column if not exists price_range text check (price_range is null or char_length(price_range) <= 120);
alter table public.business_photos add column if not exists is_logo boolean not null default false;
create unique index if not exists business_one_logo_idx on public.business_photos(business_id) where is_logo;

create type public.business_offering_kind as enum ('product', 'service');
alter type public.business_moderation_target add value if not exists 'offering';

create table public.business_offerings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null default (auth.jwt() ->> 'sub'),
  business_id uuid references public.businesses(id) on delete set null,
  kind public.business_offering_kind not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  category text not null check (char_length(trim(category)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  price numeric(12,2) check (price is null or price >= 0),
  price_unit text not null default 'per item' check (char_length(trim(price_unit)) between 1 and 80),
  in_stock boolean not null default true,
  city text not null check (char_length(trim(city)) between 2 and 120),
  area text check (char_length(area) <= 120),
  location_text text check (char_length(location_text) <= 500),
  service_area text check (char_length(service_area) <= 500),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,38}$'),
  delivery_info text check (char_length(delivery_info) <= 1000),
  availability_hours text check (char_length(availability_hours) <= 500),
  is_enabled boolean not null default true,
  contact_public_consent_at timestamptz not null,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  status public.business_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'product' or in_stock = true)
);
create index business_offerings_public_idx on public.business_offerings(kind, category, city, created_at desc) where status = 'approved' and is_enabled;
create index business_offerings_owner_idx on public.business_offerings(owner_user_id, updated_at desc);

create table public.business_offering_photos (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.business_offerings(id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^offerings/[^/]+/[^/]+/.+$'),
  alt_text text check (char_length(alt_text) <= 240),
  sort_order integer not null default 0,
  created_by text not null default (auth.jwt() ->> 'sub'),
  created_at timestamptz not null default now()
);
create table public.business_offering_favorites (
  offering_id uuid not null references public.business_offerings(id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'), created_at timestamptz not null default now(),
  primary key(offering_id, user_id)
);
create table public.business_offering_reviews (
  id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.business_offerings(id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'), rating smallint not null check(rating between 1 and 5),
  body text not null default '' check(char_length(body) <= 2000), is_approved boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(offering_id,user_id)
);
create table public.business_offering_reports (
  id uuid primary key default gen_random_uuid(), reporter_id text not null default(auth.jwt() ->> 'sub'),
  offering_id uuid references public.business_offerings(id) on delete cascade,
  review_id uuid references public.business_offering_reviews(id) on delete cascade,
  reason public.business_report_reason not null, details text check(char_length(details) <= 2000),
  created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by text,
  check(num_nonnulls(offering_id, review_id) = 1)
);
create table public.business_offering_blocks (
  user_id text not null default(auth.jwt() ->> 'sub'), offering_id uuid not null references public.business_offerings(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id, offering_id)
);

alter table public.business_offerings enable row level security;
alter table public.business_offering_photos enable row level security;
alter table public.business_offering_favorites enable row level security;
alter table public.business_offering_reviews enable row level security;
alter table public.business_offering_reports enable row level security;
alter table public.business_offering_blocks enable row level security;
create policy "offerings public or owner/admin read" on public.business_offerings for select to authenticated using (
  (status='approved' and is_enabled and not exists(select 1 from public.business_offering_blocks x where x.offering_id=id and x.user_id=auth.jwt()->>'sub'))
  or owner_user_id=auth.jwt()->>'sub' or public.business_is_admin()
);
create policy "owners create offerings" on public.business_offerings for insert to authenticated with check(owner_user_id=auth.jwt()->>'sub' and status='draft');
create policy "owners safely update offerings" on public.business_offerings for update to authenticated using(owner_user_id=auth.jwt()->>'sub' and status in ('draft','rejected')) with check(owner_user_id=auth.jwt()->>'sub' and status in ('draft','rejected'));
create policy "owners delete offerings" on public.business_offerings for delete to authenticated using(owner_user_id=auth.jwt()->>'sub' and status in ('draft','rejected'));
create policy "offering photos explicit read" on public.business_offering_photos for select to authenticated using (
  exists (
    select 1 from public.business_offerings o
    where o.id=offering_id
      and ((o.status='approved' and o.is_enabled) or o.owner_user_id=auth.jwt()->>'sub' or public.business_is_admin())
  )
);
create policy "owners manage offering photos" on public.business_offering_photos for all to authenticated using(created_by=auth.jwt()->>'sub' and exists(select 1 from public.business_offerings o where o.id=offering_id and o.owner_user_id=auth.jwt()->>'sub' and o.status in('draft','rejected'))) with check(created_by=auth.jwt()->>'sub' and exists(select 1 from public.business_offerings o where o.id=offering_id and o.owner_user_id=auth.jwt()->>'sub' and o.status in('draft','rejected')));
create policy "offering favorites safe manage" on public.business_offering_favorites for all to authenticated
  using(user_id=auth.jwt()->>'sub')
  with check(user_id=auth.jwt()->>'sub' and exists(select 1 from public.business_offerings o where o.id=offering_id and o.status='approved' and o.is_enabled and o.owner_user_id<>auth.jwt()->>'sub'));
create policy "offering reviews readable" on public.business_offering_reviews for select to authenticated using(is_approved or user_id=auth.jwt()->>'sub' or public.business_is_admin());
create policy "offering reviews safe manage" on public.business_offering_reviews for all to authenticated
  using(user_id=auth.jwt()->>'sub')
  with check(user_id=auth.jwt()->>'sub' and is_approved and exists(select 1 from public.business_offerings o where o.id=offering_id and o.status='approved' and o.is_enabled and o.owner_user_id<>auth.jwt()->>'sub'));
create policy "users/admin read offering reports" on public.business_offering_reports for select to authenticated using(reporter_id=auth.jwt()->>'sub' or public.business_is_admin());
create policy "offering reports safe insert" on public.business_offering_reports for insert to authenticated with check(reporter_id=auth.jwt()->>'sub');
create policy "offering blocks safe manage" on public.business_offering_blocks for all to authenticated
  using(user_id=auth.jwt()->>'sub')
  with check(user_id=auth.jwt()->>'sub' and exists(select 1 from public.business_offerings o where o.id=offering_id and o.status='approved' and o.is_enabled));

create unique index offering_reports_open_unique
  on public.business_offering_reports(reporter_id,offering_id,reason)
  where resolved_at is null and offering_id is not null;

create or replace function public.business_offering_validate_report()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=auth.jwt()->>'sub';
  target_owner text;
begin
  if actor is null or new.reporter_id<>actor then raise exception 'UNAUTHORIZED'; end if;
  if (select count(*) from business_offering_reports where reporter_id=actor and created_at>now()-interval '1 hour')>=5 then
    raise exception 'REPORT_RATE_LIMITED';
  end if;
  if new.offering_id is not null then
    select owner_user_id into target_owner from business_offerings
    where id=new.offering_id and status='approved' and is_enabled;
  else
    select o.owner_user_id into target_owner
    from business_offering_reviews r
    join business_offerings o on o.id=r.offering_id
    where r.id=new.review_id and r.is_approved and o.status='approved' and o.is_enabled;
  end if;
  if target_owner is null or target_owner=actor then raise exception 'REPORT_TARGET_NOT_ALLOWED'; end if;
  return new;
end
$$;
create trigger business_offering_reports_validate
before insert on public.business_offering_reports
for each row execute function public.business_offering_validate_report();

create or replace function public.business_offering_submit(p_offering_id uuid) returns public.business_offerings language plpgsql security definer set search_path=public as $$
declare v public.business_offerings%rowtype; begin
 select * into v from business_offerings where id=p_offering_id for update;
 if auth.jwt()->>'sub' is null or v.owner_user_id <> auth.jwt()->>'sub' then raise exception 'OFFERING_NOT_OWNER'; end if;
 if v.status not in ('draft','rejected') then raise exception 'OFFERING_NOT_SUBMITTABLE'; end if;
 update business_offerings set status='pending',submitted_at=now(),rejection_reason=null,updated_at=now() where id=p_offering_id returning * into v; return v;
end $$;
create or replace function public.business_offering_prepare_photo(p_offering_id uuid,p_extension text) returns text language plpgsql security definer set search_path=public as $$
declare v text:=auth.jwt()->>'sub'; begin
 if v is null or lower(trim(p_extension)) not in('jpg','jpeg','png','webp') then raise exception 'INVALID_REQUEST'; end if;
 if not exists(select 1 from business_offerings where id=p_offering_id and owner_user_id=v and status in('draft','rejected')) then raise exception 'OFFERING_PHOTO_NOT_ALLOWED'; end if;
 return 'offerings/'||v||'/'||p_offering_id::text||'/';
end $$;
create or replace function public.business_offering_set_enabled(p_offering_id uuid,p_is_enabled boolean) returns public.business_offerings language plpgsql security definer set search_path=public as $$
declare v public.business_offerings%rowtype; begin
 select * into v from business_offerings where id=p_offering_id for update;
 if auth.jwt()->>'sub' is null or v.owner_user_id<>auth.jwt()->>'sub' then raise exception 'OFFERING_NOT_OWNER'; end if;
 if v.status not in ('approved','draft','pending','rejected') then raise exception 'OFFERING_NOT_TOGGLEABLE'; end if;
 update business_offerings set is_enabled=p_is_enabled,updated_at=now() where id=p_offering_id returning * into v; return v;
end $$;
revoke all on function public.business_offering_submit(uuid), public.business_offering_prepare_photo(uuid,text), public.business_offering_set_enabled(uuid,boolean) from public, anon;
grant execute on function public.business_offering_submit(uuid), public.business_offering_prepare_photo(uuid,text), public.business_offering_set_enabled(uuid,boolean) to authenticated;

create policy "offering media uploads" on storage.objects for insert to authenticated with check(bucket_id='business-media' and name like ('offerings/'||(auth.jwt()->>'sub')||'/%') and lower(storage.extension(name)) in('jpg','jpeg','png','webp') and exists(select 1 from public.business_offerings o where o.id::text=(storage.foldername(name))[3] and o.owner_user_id=auth.jwt()->>'sub' and o.status in('draft','rejected')));
create policy "offering media explicit reads" on storage.objects for select to authenticated using(
  bucket_id='business-media'
  and exists(
    select 1
    from public.business_offering_photos p
    join public.business_offerings o on o.id=p.offering_id
    where p.storage_path=storage.objects.name
      and ((o.status='approved' and o.is_enabled) or o.owner_user_id=auth.jwt()->>'sub' or public.business_is_admin())
  )
);
create policy "offering media owner deletes" on storage.objects for delete to authenticated using(bucket_id='business-media' and name like ('offerings/'||(auth.jwt()->>'sub')||'/%'));

create or replace function public.business_delete_user_data() returns text[] language plpgsql security definer set search_path=public as $$
declare a text:=auth.jwt()->>'sub'; paths text[]; begin if a is null then raise exception 'UNAUTHORIZED'; end if;
 select coalesce(array_agg(storage_path),'{}') into paths from (select p.storage_path from business_photos p join businesses b on b.id=p.business_id where b.owner_id=a union all select p.storage_path from business_offering_photos p join business_offerings o on o.id=p.offering_id where o.owner_user_id=a) x;
 delete from business_offerings where owner_user_id=a; delete from businesses where owner_id=a; delete from business_offering_favorites where user_id=a; delete from business_offering_reviews where user_id=a; delete from business_offering_reports where reporter_id=a; delete from business_offering_blocks where user_id=a; delete from business_favorites where user_id=a; delete from business_reviews where user_id=a; delete from business_reports where reporter_id=a; delete from business_blocks where user_id=a; delete from business_admins where user_id=a; return paths; end $$;
revoke all on function public.business_delete_user_data() from public, anon; grant execute on function public.business_delete_user_data() to authenticated;