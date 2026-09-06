-- A private draft may be saved before legal/public-contact consent. Those
-- fields become mandatory when a listing leaves draft/rejected status.
alter table public.businesses
  drop constraint if exists businesses_required_submission;

alter table public.businesses
  add constraint businesses_required_submission check (
    status in ('draft', 'rejected')
    or (
      char_length(trim(name)) >= 2
      and category_id is not null
      and char_length(trim(coalesce(city, ''))) >= 2
      and phone is not null
      and public_contact_consent_at is not null
      and terms_version = '2026-09-06'
      and terms_accepted_at is not null
      and privacy_version = '2026-09-06'
      and privacy_accepted_at is not null
      and listing_rules_version = '2026-09-06'
      and listing_rules_accepted_at is not null
    )
  );