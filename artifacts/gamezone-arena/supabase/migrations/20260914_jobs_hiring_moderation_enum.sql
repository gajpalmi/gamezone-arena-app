-- Kept in its own committed migration: PostgreSQL does not permit a newly
-- added enum value to be used safely until the transaction has committed.
alter type public.business_moderation_target add value if not exists 'job';
alter type public.business_moderation_target add value if not exists 'job_seeker_profile';
alter type public.business_moderation_target add value if not exists 'job_application';
alter type public.business_moderation_target add value if not exists 'job_report';