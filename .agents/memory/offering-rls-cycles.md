---
name: Offering RLS dependency cycles
description: Prevent recursive RLS evaluation between public offerings and user interaction tables.
---

Do not let an offering visibility policy read a user-interaction table whose own policy directly queries offerings. Use operation-specific interaction policies and a narrowly scoped security-definer visibility predicate.

**Why:** A blocked-item visibility check combined with a block insertion policy that queried the offering produced PostgreSQL “infinite recursion detected in policy” at runtime despite valid SQL.

**How to apply:** When adding favorites, blocks, reviews, or reports around a protected listing, trace every policy subquery as a dependency graph and test it under the authenticated role. Revoke anonymous execution on any security-definer helper.