---
name: Durable account deletion
description: Rules for keeping account deletion retry-safe as new user data and private media are added.
---

Account deletion must persist a server-side media cleanup manifest before deleting source rows. The Clerk identity may be removed only after every manifest path is deleted and the server verifies its Storage metadata is absent. Storage delete authorization must match the current subject and an exact pending manifest path.

Deletion is a terminal state. Pending requests and hashed finalized tombstones must block new user-owned database writes and Storage uploads. Per-subject transaction locks must serialize the first cleanup with in-flight writes.

Deletion RPCs must treat a finalized tombstone as an idempotent already-clean result so a transient identity-provider deletion failure can be retried without reopening app writes.

**Why:** Source-row-dependent Storage policies stop authorizing deletion after database cleanup. In-memory paths disappear on restart, caller-trusted acknowledgment is bypassable, and concurrent writes can otherwise create orphaned data after the cleanup sweep.

**How to apply:** Whenever a user-owned table, user-reference column, write surface, or private-media path is added, extend the deletion sweep, manifest, terminal-write guard, and rollback-only integration tests in the same forward migration. Include local account-linked progress cleanup.