---
name: Applied migration corrections
description: How to reconcile a staged migration after it has been applied to production.
---

Once a migration has been applied to production, preserve its historical behavior and put any corrections in a new forward migration, including dependent RLS or Storage policy changes.

**Why:** Updating only the original file can make fresh databases correct while leaving production on the old contract, especially when RPC validation and Storage policies must change together.

**How to apply:** Check production migration history before editing SQL. If the version is already applied, use a new migration that updates every layer of the contract and verify the live definitions afterward.