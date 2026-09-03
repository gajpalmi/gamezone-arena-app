---
name: Expo game audio reliability
description: Durable constraints for reliable short sound effects in the Expo game on Android.
---

Use bundled local effects directly rather than routing them through Expo's temporary download cache, keep the audio session active between effects, and explicitly install native asset peer dependencies.

**Why:** Android Expo Go repeatedly produced vibration with no audible effect even when the WAV files were valid. The setup combined temporary cache resolution with a missing native asset peer, allowing sound loading to fail silently.

**How to apply:** For short local game effects, avoid unnecessary download-first behavior, wait for native player readiness before playback, and run Expo Doctor after audio dependency changes.