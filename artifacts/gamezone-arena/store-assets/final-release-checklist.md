# GAMEZONE ARENA — Final Play Store Checklist

## Prepared in the project

- [x] Android package is `com.gamezonearena.app`
- [x] Release version is `1.0.1`
- [x] Android version code is `2`
- [x] 1024 × 1024 app icon is configured
- [x] Android adaptive icon is configured
- [x] Production EAS profile creates an Android App Bundle
- [x] Expo dependency check passes
- [x] Expo Doctor passes all checks
- [x] Public privacy-policy route is implemented
- [x] Play Store listing copy is drafted
- [x] Data Safety and App Access guidance is drafted

## Required after API publishing

- [ ] Publish API Server as a Reserved VM, not Autoscale
- [ ] Confirm the published `/privacy-policy` URL returns HTTP 200
- [x] Set the stable production API domain in the EAS production environment
- [x] Confirm client-safe Clerk and Supabase production variables are present
- [x] Generate signed production AAB version code 2
- [x] Download and retain the final AAB

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
- [ ] Record/select a video and create a cartoon
- [ ] Confirm cartoon voice, playback, Gallery save, and WhatsApp share
- [ ] Test business, product/service, jobs, worker, maps, and file uploads
- [ ] Confirm test ads and Ad Privacy controls without clicking live ads
- [ ] Promote to Production only after all checks pass
