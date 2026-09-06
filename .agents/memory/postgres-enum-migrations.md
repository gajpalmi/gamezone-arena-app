---
name: PostgreSQL enum migration ordering
description: Safe migration ordering when extending moderation enums used by later database objects.
---

Commit additions to an existing PostgreSQL enum in their own migration before any schema, policy, function, or data statement uses the new values.

**Why:** Supabase applies a migration transactionally, and PostgreSQL rejects use of a newly added enum value before that transaction commits.

**How to apply:** Give the enum-only migration an earlier lexical/version order, apply it first, then apply dependent schema and security migrations separately.