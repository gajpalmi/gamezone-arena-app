-- Category master data is migration/admin-managed. Prevent duplicate visible names
-- while preserving independent product, service, and child-category namespaces.
create unique index if not exists business_categories_name_unique_ci
  on public.business_categories(lower(trim(name)));

create unique index if not exists offering_parent_categories_name_unique_ci
  on public.offering_categories(kind, lower(trim(name)))
  where parent_id is null;

create unique index if not exists offering_child_categories_name_unique_ci
  on public.offering_categories(kind, parent_id, lower(trim(name)))
  where parent_id is not null;

create unique index if not exists job_categories_name_unique_ci
  on public.job_categories(lower(trim(name)));