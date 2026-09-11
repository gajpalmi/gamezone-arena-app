---
name: Orval and Zod compatibility
description: OpenAPI schema choices that keep generated validators compatible with the workspace's installed Zod major version.
---

Avoid OpenAPI combinations that make the current Orval generator emit Zod 4-only helpers while the workspace remains on Zod 3. In particular, URI formats and integer schemas may generate unsupported `zod.url()` and `zod.int()` calls.

**Why:** API client generation succeeded but the generated validator library failed TypeScript compilation because those helpers do not exist in the installed Zod version.

**How to apply:** For new API fields, use compatible string/number schemas unless the workspace intentionally upgrades Zod and verifies all generated libraries. Always run the shared library typecheck after codegen.