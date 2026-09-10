---
name: Clerk JWT role compatibility
description: Security rule for Supabase operations when a valid Clerk subject is mapped to the anon PostgreSQL role.
---

Treat the PostgreSQL role and the verified JWT subject as separate authorization inputs. Compatibility access must be narrow, owner-scoped, and derived only from a nonempty `auth.jwt()->>'sub'`; never accept an owner ID from the client.

**Why:** Clerk-issued requests can carry a valid subject while PostgREST keeps the database role as `anon`. Policies and RPC grants limited to `authenticated` then fail before otherwise-correct owner checks run.

**How to apply:** Prefer actor-derived `SECURITY DEFINER` RPCs for atomic or private operations. Where direct table or Storage access is necessary, add only matching `anon` policies with exact owner, state, bucket, path, and file-type checks. Keep RLS enabled and test no-sub and cross-owner cases.