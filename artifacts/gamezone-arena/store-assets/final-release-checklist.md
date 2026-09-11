# GAMEZONE ARENA — Final Play Store Checklist

## Prepared in the project

- [x] Android package is `com.gamezonearena.app`
- [x] Release version is `1.0.3`
- [x] Android version code is `4`
- [x] 1024 × 1024 app icon is configured
- [x] Android adaptive icon is configured
- [x] Production EAS profile creates an Android App Bundle
- [x] Expo dependency check passes
- [x] Expo Doctor passes all checks
- [x] Public privacy-policy route is implemented
- [x] Play Store listing copy is drafted
- [x] Data Safety and App Access guidance is drafted

## Required before release

- [ ] Host the privacy policy at a stable public HTTPS URL
- [x] Confirm client-safe Clerk and Supabase production variables are present
- [ ] Generate and retain the replacement signed AAB without the removed Cartoon feature

## Required in Play Console

- [ ] Create/select GAMEZONE ARENA with package `com.gamezonearena.app`
- [ ] Upload AAB first to Internal testing
- [ ] Add a protected reviewer account under App access
- [ ] Enter privacy-policy URL and monitored support contact
- [ ] Complete Ads, Data safety, Content rating, and Target audience declarations
- [ ] Upload phone screenshots and feature graphic
- [ ] Add internal testers and publish the internal release

## Required on a real Android phone

- [ ] Install from the Play internal-testing link
- [ ] Test first launch, update, relaunch, sign-up, sign-in, and sign-out
- [ ] Test account deletion
- [ ] Test offline games and online Ludo create/join/reconnect
- [ ] Test game sound, vibration, and denied permissions
- [ ] Test business, product/service, jobs, worker, maps, and file uploads
- [ ] Confirm test ads and Ad Privacy controls without clicking live ads
- [ ] Promote to Production only after all checks pass
