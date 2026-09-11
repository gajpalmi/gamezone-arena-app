---
name: Cartoon local preview compatibility
description: How to handle selected cartoon videos that a local browser or device player cannot decode.
---

Do not treat successful local preview playback as a prerequisite for sending a valid selected video to the cartoon processor. Show an explicit preview-loading or compatibility error, keep the selected-file identity visible, and allow server-side processing to continue.

**Why:** A valid MP4 can remain unplayable in a browser even when supplied through a correct blob URL because the browser runtime lacks its codec. Blocking the Make Cartoon action in that state prevents the FFmpeg server from processing a file it may support.

**How to apply:** Local playback should provide feedback and early confidence, not gate generation. For guaranteed visual fallback across unsupported codecs, create a server-generated compatibility preview or poster separately.