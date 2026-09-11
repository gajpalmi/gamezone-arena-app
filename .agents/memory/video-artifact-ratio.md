---
name: Video artifact aspect-ratio persistence
description: Preserve registered video artifact services when persisting the selected aspect ratio.
---

When adding `videoAspectRatio` to a video artifact, retain the complete existing artifact manifest instead of replacing it with only `kind` and the ratio.

**Why:** A minimal manifest can validate as content but removes the registered preview service and workflow, leaving the finished video without a runnable preview.

**How to apply:** Copy the current full manifest to a temporary file, add the ratio field, and use the validated artifact-manifest replacement flow. Confirm the managed workflow still exists afterward.