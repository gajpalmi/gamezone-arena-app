# AdMob Android release checklist

The app is configured for Android package `com.gamezonearena.app` and AdMob app
ID `ca-app-pub-5348301935438016~5109940531`. Confirm that package name before
the first Play Store release because changing it later creates a different app.

## Safe build modes

- Expo Go and web do not load the native Google Mobile Ads module.
- Development builds always use Google's test banner and rewarded unit IDs.
- Non-development builds also use test inventory unless
  `EXPO_PUBLIC_ADMOB_PRODUCTION=true` is set for the final Play Store build.
- Never set that release flag for local, internal-test, or preview builds.
- Real ads require a rebuilt native Android development or production binary;
  restarting Expo Go is not enough after adding the config plugin.
- The iOS plugin entry uses Google's official sample App ID only to keep
  accidental iOS development builds safe. Obtain a real iOS App ID before any
  iOS release.

## Before enabling production inventory

1. In AdMob, confirm the Android app uses package `com.gamezonearena.app` and
   complete app verification.
2. Publish `app-ads.txt` on the verified developer website/domain using the
   exact publisher record supplied by AdMob, then wait for AdMob to crawl it.
3. Create and publish the required Google UMP consent message. The app requests
   updated consent before initializing ads and exposes **Settings → Ad Privacy**
   so users can reopen privacy choices when Google requires it.
4. Decide and accurately configure the app's target-age treatment in AdMob and
   Play Console. The app currently limits creative content to Google's `G`
   rating, requests non-personalized inventory, and deliberately does not claim
   child-directed or under-age treatment; those declarations must match the
   actual audience.
5. Complete Play Console **Data safety**, **Ads**, **Target audience and
   content**, and privacy-policy disclosures for Google Mobile Ads.
6. Build a native Android development build and verify Google's test banner and
   rewarded ad. Then make one final release build with
   `EXPO_PUBLIC_ADMOB_PRODUCTION=true`.

## Invalid-traffic safeguards

- Never click live ads yourself or ask users to click standard ads.
- Do not automate ad interaction or use production IDs while developing.
- Banner components do not run custom refresh timers and remain separated from
  game controls.
- Rewarded ads are user-initiated, have load/show cooldowns, and grant the
  disclosed offline reroll only after Google's `EARNED_REWARD` event.
- Rewarded rerolls are disabled in authoritative online matches.
- Monitor AdMob Policy Center, invalid-traffic notices, match rate, CTR spikes,
  and serving limits after each release. Pause production inventory if traffic
  looks abnormal.