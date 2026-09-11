---
name: Expo SDK 54 maps compatibility
description: Resolving the mismatch between generic Expo Go Maps advice and this workspace's SDK 54 dependency checks.
---

For GAMEZONE ARENA on the installed Expo SDK 54 version, keep `react-native-maps` at the version accepted by `expo install --check`.

**Why:** A trial pin to the generic Expo Go recommendation of Maps 1.18.0 made Expo's dependency checker fail; this workspace's SDK 54 installation explicitly requires 1.20.1.

**How to apply:** When changing Expo SDK or Maps, run `expo install --check` from the mobile app. Prefer its SDK-specific result over generic compatibility advice, then re-run Expo Doctor before an Android release.