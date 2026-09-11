---
name: FFmpeg mobile video dimensions
description: Compatibility constraints for FFmpeg-generated H.264 videos intended for phone playback.
---

When generating mobile H.264 output, calculate one aspect-preserving scale factor that caps both width and height, then truncate both dimensions to even values. Cap the frame rate before declaring a fixed H.264 level, and verify the output stream metadata afterward.

**Why:** A conditional scale using an automatic height produced an odd 720×405 output for a common 16:9 source, which libx264 could not encode. Preserving a 60fps phone source while forcing Level 3.1 can also create a stream that exceeds the level's macroblock rate even though FFmpeg writes it.

**How to apply:** Any phone-targeted FFmpeg pipeline should validate codec, profile, level, pixel format, dimensions, and frame rate on the finished file rather than treating a successful process exit as sufficient.