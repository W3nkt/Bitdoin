# Push notifications in the iOS and Android apps

The website already sends browser notifications (Web Push). The apps now receive notifications through Apple (APNs) and Google (FCM) too, with the same switches in the profile, plus two new kinds: **streak / leaderboard / comeback** reminders and **well-being** nudges that send people off to rest.

Code: `src/lib/nativePush.ts` (the phone), `supabase/functions/send-push/` (`native-push.ts` talks to Apple and Google, `messages.ts` has the words, `index.ts` the `engagement` action), `supabase/migrations/176_native_push_engagement.sql` (devices and the rules for who gets what).

## What members get

| Message | Who | When (Laos time) | Opens |
|---|---|---|---|
| Daily quote, new-book digest, announcements, My Scores reminders | as before (switches in the profile) | as before | as before |
| 🔥 **Streak at risk** | Streak is alive (finished yesterday) and today's mentor activities are not done | 18:00-20:59, once a day | Academy home |
| 📈 **Close to the next rank** | Within 100 XP of the member above, today's mentor not finished | 15:00-20:59, every 2 days | Academy home |
| 👋 **Comeback** | Has not opened the app for 3 to 30 days | 17:00-19:59, every 4 days | Academy home |
| ☀️ **Daily activities waiting** | Opened the app yesterday or the day before, not today, nothing done today | 12:00-16:59, once a day | Academy home |
| ☕ **Take a break** | In the app for 90+ minutes in one go, right now | 08:00-21:29, 4 hours apart | the app |
| 🌙 **Put the phone down** | Using the app late | 21:30-23:59, once a day | the app |

The first four need the *Streak and leaderboard reminders* switch; the last two the *Rest and well-being* switch (Academy profile > Notifications, apps only). Turning Academy notifications on for the first time on a phone turns on both (the prompt says so); each can be switched off alone. Streak, rank and comeback messages are for Academy members (Free included). Turning on only the Bookstore switch gives none of these.

**Rules that protect members** (all in `push_claim_engagement`, not in the app):

- One message per member per run. If several apply, the first of these wins: put the phone down, take a break, streak, rank, comeback, daily.
- At most **2 engagement messages a day** and **2 well-being messages a day**, and **2 hours** between any two.
- Nothing while the app is open (opened in the last 10 minutes), and nothing in the small hours.
- After **3 engagement messages that were not followed by opening the app, it stops** until the member opens the app again.
- No scores, names or comparisons with other people on the lock screen: only the member's own streak and their own XP gap.
- Signing out removes the phone from the account, so the next person on a shared phone gets nothing meant for the last one.

To change a window, a cap or a distance, write a new migration with `create or replace function public.push_claim_engagement` (copy it from 176) and test it with `npm run test:db -- native_push`. The words are in `supabase/functions/send-push/messages.ts` (`engagementMessage`).

## One-time setup (owner)

Nothing is sent until these are done; before that the switches in the app still work and phones are simply saved.

### 1. Apple (iPhone)

1. developer.apple.com > Certificates, Identifiers & Profiles > Identifiers > `store.bitdoin.app` > turn on **Push Notifications** > Save. (The TestFlight workflow signs with `-allowProvisioningUpdates`, so the profile is refreshed by itself.)
2. Keys > **+** > name it "Bitdoin push" > tick **Apple Push Notifications service (APNs)** > Continue > Register > **Download** (Apple allows it once). Note the **Key ID**; the **Team ID** is the same as `APPLE_TEAM_ID`.
3. Supabase > Edge Functions > Secrets (or `npx supabase secrets set`):
   - `APNS_KEY_P8`: the whole text of the `.p8` file, BEGIN and END lines included
   - `APNS_KEY_ID`: the 10-character Key ID
   - `APNS_TEAM_ID`: the 10-character Team ID
   - optional `APNS_BUNDLE_ID` (default `store.bitdoin.app`) and `APNS_ENVIRONMENT` (`production` by default, which is TestFlight and the App Store; a build installed straight from Xcode uses `sandbox`, and the function tries the other one by itself when Apple says BadDeviceToken)

### 2. Google (Android)

1. console.firebase.google.com > Add project (no Analytics needed) > Add app > Android > package name **`store.bitdoin.app`** > download `google-services.json`.
2. GitHub > Settings > Secrets and variables > Actions > new secret **`GOOGLE_SERVICES_JSON`**: paste the whole file. The Android job writes it to `android/app/google-services.json` (git ignores that path). Without it the APK still builds but cannot receive notifications, and the run shows a warning.
3. Firebase > Project settings > Service accounts > **Generate new private key**. Supabase secret **`FCM_SERVICE_ACCOUNT`**: the whole JSON file (or that file base64-encoded).

### 3. Supabase (production changes: ask before running)

1. Apply `supabase/migrations/176_native_push_engagement.sql` (SQL editor or `npx supabase db push`). **Do this before deploying the function**: the new `engagement` action needs it. The old actions keep working either way.
2. `npx supabase functions deploy send-push`
3. The cron job `push-engagement` (every 15 minutes) is created by the migration. Check it under Database > Cron Jobs.

Never paste the key, the service account or any token into chat, the repo or a `VITE_*` variable.

### 4. Build and try it

1. Run **Mobile apps** in GitHub Actions (Android, and iOS with TestFlight).
2. In the app, sign in, open **Academy > profile > Notifications**, turn on *Daily reminder*: the phone asks for permission once, on that tap. Then *Send a test notification*.
3. To see each new message on your own phone without waiting for its window, sign in as an admin and call send-push with `{ "action": "test-engagement", "kind": "STREAK_AT_RISK" }` (also `XP_RIVAL`, `DAILY_NOT_OPENED`, `COMEBACK`, `BREAK`, `WINDDOWN`). It sends to the caller's own devices only.
4. Tap a notification with the app closed, in the background and open: it should land on the page in the table (an open app shows the text as a message at the bottom instead, because the phone shows nothing while the app is in front).

## Store forms

- **App Store Connect > App Privacy**: add *Device ID* (the push token, linked to the account, used for app functionality). Nothing is used for tracking or ads.
- **Google Play > Data safety**: *Device or other IDs*, collected, used for app functionality.
- Apple guideline 4.5.4: push is never required to use the app, the prompt follows a tap on a switch, and nothing here is advertising. Keep it that way: do not add promotional messages to the engagement kinds. Bookstore announcements go through the existing opt-in switch.
- Academy has students under 18. The messages are written to encourage, never to shame a missed day, and the well-being ones exist for them. Keep the caps.

## Not tested yet

- **No real phone has run this.** Everything was checked with tests and type checks: the database rules (`npm run test:db -- native_push`), the Apple and Google requests and answers against stand-ins (`npm run test:db -- native_push_send`), the web and app bundles, and `cap sync`. The first real send to Apple and Google, the permission prompt, the tap-to-open path and the Android channel have not been seen on a device.
- Windows has no Xcode or Android SDK, so the entitlement, the AppDelegate hooks and the Android manifest entries compile for the first time in GitHub Actions.
- The Lao words are drafted to the Academy Lao standard but have not been read by a Lao speaker. Please have them checked (the six pairs in `engagementMessage`).
- iOS shows no picture in a notification and no badge number; Android shows the book picture only for announcements that have one.

## If something does not work

| Symptom | Likely cause |
|---|---|
| Android: turning a switch on says it could not be saved | `GOOGLE_SERVICES_JSON` was not set when this APK was built, or the package name in Firebase is not `store.bitdoin.app` |
| iPhone: permission prompt never appears | The person already said no once; iOS never asks again. The card then explains how to allow it in Settings |
| Nothing arrives on iPhone, logs show `APNs refused ... TopicDisallowed` or `BadTopic` | Push Notifications is not enabled on the App ID, or `APNS_BUNDLE_ID` is wrong |
| Logs show `APNs refused 403 InvalidProviderToken` | `APNS_KEY_ID`, `APNS_TEAM_ID` or the `.p8` text do not match each other |
| Logs show `FCM refused 403` | The service account is from a different Firebase project than `google-services.json`, or the Firebase Cloud Messaging API is disabled for it |
| Devices vanish from `push_subscriptions` | Apple or Google said the app was uninstalled or the token expired; the row is removed on purpose |
| A streak message never comes | The member has *Streak and leaderboard reminders* off, has three unopened messages (opening the app resets that), is not an active Academy member, or is inside the 2 hour / 2 per day limits |
