---
name: Expo SDK 54 Android architecture
description: Why GAMEZONE Android production builds must keep React Native New Architecture enabled with the current native dependency set.
---

Keep React Native New Architecture enabled while using Expo SDK 54 with Reanimated 4 and the current Google Mobile Ads native package.

**Why:** Disabling New Architecture causes separate Gradle failures: Reanimated 4 rejects legacy architecture, while downgrading Reanimated alone leaves Google Mobile Ads unable to compile its generated native module spec. The same native dependency set previously built successfully with New Architecture.

**How to apply:** Preserve deferred and failure-tolerant native ads initialization for startup reliability, but do not disable New Architecture as a crash workaround unless the affected native packages are also replaced with verified legacy-compatible versions.