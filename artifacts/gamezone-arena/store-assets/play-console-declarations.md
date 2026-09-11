# GAMEZONE ARENA — Play Console Declarations

Use these answers as a factual submission guide. Confirm them against the final
installed AAB and the developer's actual Google, AdMob, Clerk, and Supabase
dashboard settings before submitting.

## App access

- Parts of the app are available without signing in, including eligible casual
  games.
- Business, listing, jobs, profile, saved content, and other owner-specific
  features require an account.
- In Play Console, provide a dedicated reviewer account in **App access**.
- Do not put reviewer passwords in this repository or chat. Enter them only in
  the protected Play Console reviewer-instructions form.
- Suggested instruction: "Sign in with the supplied reviewer account. Use the
  Games tab for Ludo and casual games, and the Business areas for listing,
  product/service, job, and worker workflows."

## Ads

- Select **Yes, my app contains ads**.
- Google Mobile Ads provides banner and rewarded inventory.
- Internal testing builds must use test inventory.
- Production inventory must not be tested by clicking live ads.

## Target audience

- Recommended selection: **18 and over**.
- This matches business listings, jobs, worker profiles, public contact choices,
  user-generated content, location features, and advertising.
- Keep this declaration consistent with AdMob age-treatment settings.

## Data safety — data collected

Declare applicable data types used by enabled features:

- Personal information: name and optional contact information entered in
  profiles or listings
- User IDs: account identifier supplied by Clerk
- Approximate or precise location: only when the user chooses a location or map
  feature
- Photos and videos: selected for listings or profiles
- Files and documents: selected resume or listing documents where supported
- User-generated content: listings, descriptions, reviews, jobs, applications,
  reports, and profile content
- App activity: feature interactions needed to operate games, listings, saved
  items, and moderation
- Device or other IDs: advertising identifiers and related consent choices
  processed by Google Mobile Ads
- App information and performance: diagnostics produced by integrated service
  providers

## Data safety — purposes

Depending on the data type, select the applicable purposes:

- App functionality
- Account management
- Developer communications when the user supplies contact information
- Fraud prevention, security, and compliance
- Advertising or marketing for advertising identifiers
- Analytics or diagnostics where provided by integrated services

## Data sharing and processing

- Clerk processes authentication and account identifiers.
- Supabase processes database records and stored media.
- Google processes advertising identifiers, consent choices, ad delivery, and
  related diagnostics.
- Expo services may process delivery and notification information.
- Do not claim that no data is shared if Play Console defines advertising or
  service-provider transfers as sharing for the selected data type.

## Security practices

- Data is transmitted using HTTPS.
- Account deletion is available from the Profile screen.
- Private media uses restricted access where implemented.
- User-generated public content may remain visible according to its moderation,
  visibility, and retention state until removed.

## Content rating topics to disclose

- Users can submit public listings and profile content.
- The app includes online interaction and multiplayer play.
- The app contains advertising.
- Users can report and block inappropriate content.
- Complete the questionnaire using actual app behavior; do not select answers
  solely to obtain a lower rating.
