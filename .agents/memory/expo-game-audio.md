---
name: Expo game audio reliability
description: Durable constraints for reliable short sound effects in the Expo game on Android.
---

Use short bundled effects with separate playback paths: synchronous HTML Audio for web previews and preloaded `expo-audio` player pools for Expo Go/native Android. Prefer PCM WAV for native effects and keep the audio session active.

**Why:** Web-preview success does not validate QR/Expo Go audio. On Expo Go, compressed OGG replay and audio-session teardown can produce one successful sound followed by silence. SDK 54 also deprecates expo-av.

**How to apply:** Trim leading silence/tails, call HTMLAudioElement.play synchronously on web, preload pooled native players with `keepAudioSessionActive`, play each player directly the first time, and pause/seek only on reuse. Confirm Android exports include every effect.