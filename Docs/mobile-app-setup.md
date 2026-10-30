# Mobile apps (iOS and Android)

The apps are the website wrapped with Capacitor: the same React code, bundled inside a native shell. Bundle ID: `store.bitdoin.app` (iOS and Android).

## Build the apps in GitHub Actions

Actions > **Mobile apps** > Run workflow. It reuses the website's `VITE_*` secrets and variables.

| Input | Result |
|---|---|
| `platform` = both / android / ios | Which apps to build |
| `ios_upload` = on | Also signs the iOS build and uploads it to TestFlight |

- **Android**: the run page has a `bitdoin-android-debug` artifact (an APK). Download it on the phone and install it (allow "install unknown apps" when asked). It is a debug build, for testing only.
- **iOS compile check**: builds for the simulator without signing. It proves the project compiles; it does not give you an app for a real iPhone.
- **iOS TestFlight**: archives, signs and uploads. Then add yourself as an internal tester in App Store Connect > TestFlight and install from the TestFlight app.

## One-time setup for the TestFlight upload

1. **App Store Connect > Apps > New app**: bundle ID `store.bitdoin.app` (the identifier already exists in the Developer portal), name Bitdoin. The upload fails until this app record exists.
2. **App Store Connect > Users and Access > Integrations > App Store Connect API**: create a key with the **Admin** role (cloud signing needs it). Note the Key ID and the Issuer ID, and download the `.p8` file (Apple only lets you download it once).
3. **GitHub > Settings > Secrets and variables > Actions**:
   - secret `ASC_KEY_ID`: the Key ID
   - secret `ASC_ISSUER_ID`: the Issuer ID
   - secret `ASC_KEY_P8`: the full text of the `.p8` file, including the BEGIN and END lines
   - variable `APPLE_TEAM_ID`: your 10-character Team ID (developer.apple.com > Membership details)

Never put these in a `VITE_*` value: everything with that prefix is bundled into the app and the website.

## Before the apps can sign anyone in

Google, Facebook and Apple sign-in opens the provider's page in the system browser and returns through `store.bitdoin.app://auth/callback`. That address must be allowed:

- **Supabase > Authentication > URL Configuration > Redirect URLs**: add `store.bitdoin.app://auth/callback`. Without it the browser lands on the website instead of the app.
- **Supabase secret `ALLOWED_ORIGINS`** (used by the edge functions): if it is set, add `capacitor://localhost` (iOS) and `https://localhost` (Android) to the list, or every edge function call from the apps is refused. If it is empty, nothing to do.

No new Google, Facebook or Apple credentials are needed; the existing web providers are reused. Email and password sign-in needs nothing extra.

## Version numbers

The version name comes from `version` in `package.json`. The build number is the workflow run number, so every upload is higher than the last.

## Local builds

`npm run cap:sync` builds the web bundle in native mode and copies it into `android/` and `ios/`. Opening them needs Android Studio (Android) or a Mac with Xcode (iOS).
