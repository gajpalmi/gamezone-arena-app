-- Consent is required when an offering enters moderation, not while the owner
-- is still saving a private draft.
alter table public.business_offerings
  alter column contact_public_consent_at drop not null,
  alter column terms_version drop not null,
  alter column terms_accepted_at drop not null;

alter table public.business_offerings
  drop constraint if exists business_offerings_publish_consent;

alter table public.business_offerings
  add constraint business_offerings_publish_consent check (
    status in ('draft', 'rejected')
    or (
      contact_public_consent_at is not null
      and terms_version is not null
      and terms_accepted_at is not null
    )
  );