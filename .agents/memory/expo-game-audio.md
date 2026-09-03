---
name: Expo game audio reliability
description: Durable constraints for reliable short sound effects in the Expo game on Android.
---

Use short local OGG effects with separate playback paths: synchronous HTML Audio for web previews and SDK-supported `expo-audio` players for Expo Go/native Android. Register `ogg` in Metro.

**Why:** Web-preview success does not validate QR/Expo Go audio. SDK 54 deprecates expo-av, and source effects with leading silence or multi-second tails make game feedback feel delayed.

**How to apply:** Trim leading silence/tails, call HTMLAudioElement.play synchronously on web, preload expo-audio players on native, and confirm Android exports include every short effect.