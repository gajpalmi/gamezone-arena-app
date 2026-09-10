---
name: Expo Router native component placement
description: Prevent native-only modules from entering Expo web bundles through route discovery.
---

Keep platform-specific components that import native-only packages outside the Expo Router `app/` directory. Import an extensionless component path from a route and provide matching `.native.tsx` and `.web.tsx` files under `components/`.

**Why:** Expo Router scans `app/` as routes. A `.native.tsx` helper inside that directory can still enter web route discovery and trigger a native-module bundling failure even when a web counterpart exists.

**How to apply:** Put route screens only under `app/`; place helpers such as native maps under `components/`, and never directly import the `.web` variant from a shared screen.