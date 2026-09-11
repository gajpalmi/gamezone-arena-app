---
name: Cartoon ink compositing
description: How to preserve poster colors while adding strong FFmpeg cartoon outlines.
---

Apply detected edges as the alpha channel of a black ink layer, then overlay that layer on the smoothed, color-quantized frame.

**Why:** Directly blending a grayscale edge stream with the color stream can replace or neutralize chroma, producing a gray shadow effect instead of a vivid cartoon.

**How to apply:** For stronger FFmpeg-only cartoon styles, build poster colors and edge ink separately. Use `alphamerge` for the ink transparency and `overlay` for the final composition.