---
name: Expo game audio reliability
description: Durable constraints for reliable short sound effects in the Expo game on Android.
---

Use local OGG effects with separate playback paths: direct synchronous HTML Audio for web previews, and imperative `expo-av` with speaker routing for native Android. Register `ogg` in Metro.

**Why:** Testing happened in mobile Chrome, where native speaker-routing changes do not apply and an async wait can lose browser user-gesture permission. OGG also fails bundling unless Metro recognizes it.

**How to apply:** On web call HTMLAudioElement.play synchronously from the tap; on native preload and replay through expo-av. Confirm web/native exports list every sound and check playback resolution in a real browser.