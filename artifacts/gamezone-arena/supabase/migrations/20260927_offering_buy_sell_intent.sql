alter table public.business_offerings
  add column if not exists listing_intent text not null default 'sell'
  check (listing_intent in ('buy', 'sell'));

alter table public.business_offerings
  drop constraint if exists business_offerings_service_sell_only;

alter table public.business_offerings
  add constraint business_offerings_service_sell_only
  check (kind = 'product' or listing_intent = 'sell');

create index if not exists business_offerings_intent_idx
  on public.business_offerings(kind, listing_intent, created_at desc)
  where status = 'approved' and is_enabled;