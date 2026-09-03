---
name: Ludo Supabase scope
description: Approved boundary for GAMEZONE ARENA Ludo multiplayer and chat.
---

Keep Ludo chat disabled and retain the current Supabase room synchronization. Do not create, rename, or guess a `ludo_message` table or server-authority function unless the user explicitly changes this decision.

**Why:** Read-only inspection confirmed the live project exposes `ludo_rooms`, `ludo_players`, and `ludo_moves`, but not `ludo_message`. The user chose to avoid additive schema work.

**How to apply:** Multiplayer work may use the verified existing room, player, and move fields. Treat chat and new database authority functions as out of scope.