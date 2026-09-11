---
name: Cartoon mobile uploads
description: Why cartoon source videos use chunked upload instead of one large request.
---

Send cartoon source videos to the API in small sequential chunks rather than one large raw-body request. Refresh the temporary upload-session expiry after every accepted chunk. Queue FFmpeg work as an idempotent background job and poll short status requests instead of holding the completion request open.

**Why:** Real mobile Chrome uploads on a normal mobile connection repeatedly reached the API but aborted after roughly 26–31 seconds before the raw request body completed. After chunking fixed that, the phone still aborted a long-running completion request and retried it after the upload session had been consumed, producing a false session-expired error. Short upload and polling requests completed reliably.

**How to apply:** Preserve chunk ordering, declared-size checks, client binding, total-size limits, abandoned-upload/job cleanup, idempotent completion retries, and quota counting only after successful FFmpeg output. Keep the direct generation endpoint only for compatible callers and small requests.