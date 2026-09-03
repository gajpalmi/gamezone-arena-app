---
name: Expo game audio reliability
description: Durable constraints for reliable short sound effects in the Expo game on Android.
---

Use bundled local effects through the imperative `expo-av` Sound API, explicitly enable audio, route playback to the speaker, and keep native asset peer dependencies installed.

**Why:** Android Expo Go repeatedly produced vibration with no audible effect even when WAV files and dependencies were valid. `expo-audio` accepted play calls without errors but did not produce device output, so promise-based load/replay status from `expo-av` is required here.

**How to apply:** Preload short local effects, verify loaded status, explicitly enable audio and speaker routing, use replay promises for each effect, and run Expo Doctor after audio dependency changes.