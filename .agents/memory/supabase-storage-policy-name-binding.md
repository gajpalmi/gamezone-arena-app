---
name: Supabase storage policy name binding
description: PostgreSQL name-resolution pitfall in storage.objects RLS policies that join tables containing their own name column.
---

In a policy on `storage.objects`, always qualify the object path as `storage.objects.name` when a subquery joins another relation that also exposes a `name` column.

**Why:** PostgreSQL can resolve a bare `name` inside the joined subquery to the joined relation's column. The policy can be accepted successfully but then deny legitimate storage reads and uploads.

**How to apply:** After creating or replacing a storage policy, inspect its deparsed expression in `pg_policies` or `pg_policy`, then run owner, other-user, approved-resource, and admin access checks.