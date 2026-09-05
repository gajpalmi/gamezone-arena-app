---
name: Ludo movement and capture rules
description: The confirmed distinction between path movement and capture protection in GAMEZONE ARENA Ludo.
---

Token stacks must never block another token's path on any square, safe or normal. Tokens may continue through or land on occupied squares. Two or more same-color tokens together remain protected from capture; one opponent token on a normal square can be captured, while safe-square tokens cannot.

**Why:** The user explicitly corrected the rule to remove path blockades everywhere while retaining stack capture protection.

**How to apply:** Keep offline client validation and online Supabase authority validation aligned. Do not reject a move because two or more opponent tokens occupy a traversed or destination square.