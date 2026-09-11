---
name: Mobile web video sharing
description: Reliable file sharing from Android Chrome and other mobile web browsers.
---

Preload the generated video as a browser `File`, then pass that file to the Web Share API directly from the user's button tap.

**Why:** Opening a video URL does not invoke WhatsApp or Messages, and downloading the file after the tap may outlast the browser's temporary user-activation window.

**How to apply:** Prepare the file while the result screen is open, enable Share only when ready, check `navigator.canShare({ files })`, and call `navigator.share` from the press handler.