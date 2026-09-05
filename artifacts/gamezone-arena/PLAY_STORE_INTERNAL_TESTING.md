# Play Store Internal Testing

GAMEZONE ARENA is configured with:

- Android package: `com.gamezonearena.app`
- App version: `1.0.0`
- Android version code: `1`
- Internal artifact: Android App Bundle (`.aab`)
- Internal ads: Google test inventory
- Production ads: live inventory only in the `production` EAS profile

Do not change the Android package after the first Play Console upload. Every
future uploaded build must use a higher `android.versionCode`.

## One-time Expo/EAS setup

Run these commands from `artifacts/gamezone-arena`:

```bash
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest project:info
```

The app is already linked to existing Expo Project ID
`4e9dc944-2a7b-4051-95be-b276401e6e06`. Do not run `eas init` and do not create
another Expo project. After login, `project:info` must identify the existing
GAMEZONE ARENA project. If it does not, stop before building and verify that the
logged-in Expo account has access to that project. Let EAS manage the Android
signing keystore unless an existing GAMEZONE ARENA upload key already exists.

In the linked Expo project's **production** environment, add these build-time
variables using the Expo dashboard. Copy them from the matching Replit
environment without posting their values in chat or committing them:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Do not add `CLERK_SECRET_KEY`, `SESSION_SECRET`, database passwords, or other
server secrets to the mobile app. `EXPO_PUBLIC_*` values are bundled into the
client and must only contain client-safe publishable/anonymous values.

## Create the Internal Testing AAB

This cloud build can consume Expo/EAS build quota or credits. Start it only
after the owner confirms:

```bash
pnpm dlx eas-cli@latest build --platform android --profile internal
```

The `internal` profile deliberately uses Google's test ad unit inventory while
still producing a Play-compatible signed `.aab`. This prevents invalid live-ad
traffic during testing.

## Upload with Chrome

1. Open Google Play Console and create/select GAMEZONE ARENA.
2. Confirm the package is exactly `com.gamezonearena.app`.
3. Complete App access, Ads, Content rating, Target audience, Data safety, and
   privacy-policy declarations accurately.
4. Open **Testing → Internal testing → Create new release**.
5. Upload the `.aab` downloaded from the completed EAS build.
6. Add tester emails or a tester Google Group, publish the internal release,
   and install through the generated Play testing link.
7. Test sign-up/login/logout, session restore, all games, online/offline Ludo,
   room reconnects, audio/haptics, test banners, rewarded reroll, consent, and
   Settings → Ad Privacy.

Before testing secure online Ludo, apply the repository's Supabase migration to
the owner project. Keep chat disabled unless its missing schema is deliberately
implemented later.

## Production later

Only after Internal Testing passes, finish `ADMOB_RELEASE_CHECKLIST.md`, increase
`android.versionCode` for a changed build, and run:

```bash
pnpm dlx eas-cli@latest build --platform android --profile production
```

The production profile enables the confirmed live AdMob unit IDs. Never use it
for local development or routine testing.