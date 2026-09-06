---
name: Public taxonomy RLS
description: How to expose active category reference data without breaking anonymous reads.
---

Use separate anonymous and authenticated SELECT policies when authenticated readers may also use an admin helper. The anonymous policy should depend only on safe row fields such as active status.

**Why:** Putting an authenticated-only admin function in a shared `active OR is_admin()` policy can make anonymous reads fail with a function permission error, even for active rows.

**How to apply:** For public category/taxonomy tables, give anon an active-only policy and authenticated users a separate active-or-admin policy. Keep mutation policies absent for normal users.