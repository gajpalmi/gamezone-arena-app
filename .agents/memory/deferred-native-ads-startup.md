---
name: Deferred native ads startup
description: Keeping optional Google Mobile Ads initialization from delaying the first authenticated or signed-out screen.
---

Initialize Google Mobile Ads only after the first rendered app frame and an idle delay. Ads may fail without blocking navigation, and native module, consent, configuration, and SDK failures remain available as diagnostics.

**Why:** Native SDK setup and consent work are optional at launch. They must not leave Android users waiting at the splash screen or prevent them from reaching authentication.

**How to apply:** Keep native ads lazily required, schedule warm-up from a post-render root effect, make ad surfaces wait longer than that delay, and permit a later call to retry when initialization returned false.