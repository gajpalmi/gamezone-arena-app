---
name: Expo game audio reliability
description: Durable constraints for reliable short sound effects in the Expo game on Android.
---

Use bundled local OGG/Opus effects through the imperative `expo-av` Sound API, explicitly enable audio, route playback to the speaker, and register `ogg` in Metro asset extensions.

**Why:** Android Expo Go repeatedly produced vibration with no audible effect even when WAV files and dependencies were valid. `expo-audio` accepted play calls without output; OGG also fails bundling unless Metro explicitly recognizes it.

**How to apply:** Preload local OGG effects, verify loaded status, enable audio and speaker routing, use replay promises, register OGG with Metro, and confirm an Android export lists every sound asset.