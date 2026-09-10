# GAMEZONE ARENA Play Store Release Handoff

Verified on September 10, 2026.

## Release identity

- App name: GAMEZONE ARENA
- Android package: `com.gamezonearena.app`
- Version: `1.0.0`
- Version code: `1` (valid only if this package has never uploaded version code 1)
- Linked Expo project: `4e9dc944-2a7b-4051-95be-b276401e6e06`
- Output required by Google Play: signed Android App Bundle (`.aab`)

Never change the Android package after the first Play Console upload. Increase
the version code for every later uploaded bundle.

## Checks completed in this workspace

- Expo SDK dependency alignment passed
- Expo Doctor passed all 18 checks
- TypeScript passed with no errors
- Production Android JavaScript/Hermes export completed
- App icon is a 1024 × 1024 PNG and an Android adaptive icon is configured
- Production profile is configured for an Android App Bundle
- Production profile enables live AdMob inventory; internal profiles keep test inventory
- AdMob Android App ID is configured for `com.gamezonearena.app`
- Production client-safe Clerk and Supabase environment secret names are present
- Buy/Sell product intent, basket action, Business, Jobs, photos, GPS, and maps remain in the release code
- In-app legal/privacy disclosure covers authentication, listings, jobs, permissions, ads, service providers, retention, and deletion

## External release blockers

These steps cannot be truthfully completed by source-code checks:

1. **Signed AAB:** Replit does not provide guided Google Play submission. Generate
   the signed Android App Bundle using the linked project's integrated Android
   build surface. Confirm any build quota or credit charge before starting.
2. **Public privacy-policy URL:** Google Play requires a public HTTPS URL, not
   only the policy screen inside the app. Publish the GAMEZONE ARENA policy on a
   stable public website controlled by the developer.
3. **Play Console account:** Create or select the Play Console app with package
   `com.gamezonearena.app`, and confirm that version code 1 has not already been
   used.
4. **AdMob dashboard:** Confirm app verification, publish `app-ads.txt`, publish
   the required UMP consent message, and ensure target-age declarations match
   the Play Console declarations.
5. **Physical Android test:** Install through Internal Testing and complete the
   checklist below before moving the same release to production.

## Internal Testing checklist

- Install, first launch, update, and relaunch
- Sign up, email verification, sign in, sign out, and session restore
- Account deletion and associated private-media cleanup
- All offline games; online Ludo create/join/reconnect
- Audio, haptics, notifications, and denied-permission behavior
- Camera/gallery upload for Business and Product/Service
- Resume image/PDF/DOCX selection for Jobs profile
- Current location and map selection for Business, Product/Service, and Jobs
- Business create/edit/submit and owner-only access
- Product `SELL PRODUCT` → `FOR SALE` → `BUY / ADD TO BASKET`
- Product `WANT TO BUY` badge and contact-buyer route
- Service create/edit/submit
- Employer Job and worker profile create/edit/submit
- Test banner, rewarded reroll, UMP consent, and Settings → Ad Privacy
- Block, report, favorites, share links, and offline/error recovery

Do not click live ads during testing. Internal builds must use Google test
inventory.

## Play Console declarations

Complete these from the actual behavior and dashboard configuration:

- App access: explain how reviewers can access signed-in areas
- Ads: declare that the app contains ads
- Content rating questionnaire
- Target audience and content
- Data safety: account identifiers, user-generated content, photos/files,
  precise location when selected, device/advertising identifiers, diagnostics,
  and each linked purpose/sharing declaration
- Privacy-policy URL and developer contact
- Account deletion availability
- Store listing, screenshots, feature graphic, app category, and support contact

Upload first to **Testing → Internal testing**. Promote to production only after
the installed signed build passes the full checklist.