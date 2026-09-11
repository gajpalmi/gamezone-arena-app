---
name: Cartoon mobile uploads
description: Why cartoon source videos use chunked upload instead of one large request.
---

Send cartoon source videos to the API in small sequential chunks rather than one large raw-body request. Refresh the temporary upload-session expiry after every accepted chunk.

**Why:** Real mobile Chrome uploads on a normal mobile connection repeatedly reached the API but aborted after roughly 26–31 seconds before the raw request body completed. Small chunks completed reliably over the same route and produced a valid result.

**How to apply:** Preserve chunk ordering, declared-size checks, client binding, total-size limits, abandoned-upload cleanup, and quota counting only after successful FFmpeg output. Keep the direct generation endpoint only for compatible callers and small requests.