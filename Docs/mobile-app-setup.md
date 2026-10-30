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

## Facebook sign-in that opens the Facebook app

Google and Apple open the browser. Facebook is different: with the settings below, **Continue with Facebook** uses Facebook's own login, which opens the Facebook app to authorize (when it is installed; otherwise Facebook's login page opens over the app) and then returns to Bitdoin signed in. Supabase's built-in Facebook login cannot check what that login returns, so a Bitdoin Edge Function (`facebook-native-login`) does: it asks Facebook whether the token is valid **and was issued to your app**, finds or creates the account, and gives the app a one-time token that becomes a normal Supabase session. The website's Facebook login is unchanged.

**iOS first.** The Facebook app login is on for **iOS only** for now. Android keeps using the browser for Facebook, because Facebook only accepts an Android build signed with a registered key and there is no fixed signing key until the Play Console release is set up. When that is done: add the Android platform in Meta (below) and remove the `Capacitor.getPlatform() === 'ios'` check in `src/lib/nativeFacebook.ts`.

Until you finish the steps, nothing breaks: without `FACEBOOK_APP_ID` in the build, Facebook sign-in in the apps keeps using the browser.

**1. Meta for Developers** (the Facebook app you already use for the website):
- Settings > Basic: note the **App ID** and **App Secret**. Settings > Advanced: note the **Client token**.
- Add the **iOS** platform: bundle ID `store.bitdoin.app`; turn **Single Sign-On** on.
- **Android (later, with the Play Store release):** add the **Android** platform: package name `store.bitdoin.app`, class name `store.bitdoin.app.MainActivity`, turn **Single Sign-On** on, and add the **key hash** of the key the APK is signed with. Facebook rejects a build whose hash it does not know. The debug APK from the workflow is signed with a new debug key on every run, so its hash changes each time; Android needs a fixed signing key (which the Play Store release needs anyway) before Facebook login works there reliably. iOS has no such step.
- `public_profile` and `email` need no app review.

**2. Supabase**
- Apply `supabase/migrations/171_facebook_app_login.sql` (SQL editor, or `supabase db push`) and record it like the earlier ones.
- Deploy the function: `supabase functions deploy facebook-native-login`.
- Add two secrets (Edge Functions > Secrets, or `supabase secrets set`): `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`. The App Secret stays on the server only.

**3. GitHub** (Settings > Secrets and variables > Actions): variable `FACEBOOK_APP_ID` and secret `FACEBOOK_CLIENT_TOKEN`. Set both or neither: the workflow stops if only one is set. It puts them into `Info.plist` and `strings.xml` before building (`scripts/apply-facebook-config.mjs`; the repo keeps placeholders), and passes the App ID to the app code as `VITE_FACEBOOK_APP_ID`. Never put the App Secret here.

**How accounts are matched.** A person who has signed in with Facebook on the website is found by their Facebook ID. A new Facebook person whose Facebook email matches an existing Bitdoin account is signed into that account (Facebook confirms the email; Supabase does the same linking on the website). Otherwise an account is created, as the website does. Facebook must share an email: without one the person is told to use email or Google. If an email's account already belongs to a different Facebook profile, the sign-in is refused. Admin accounts still need their authenticator code as before.

**Store forms.** List Facebook Login (name, email, user ID; used for sign-in) in Apple's App Privacy answers and Google Play's Data safety form. The app turns off the Facebook SDK's automatic app events and advertiser ID collection, so the SDK is used only to sign in.

**To test:** install a build, tap Facebook, and check that the Facebook app opens, you approve, and you land back in Bitdoin signed in. Then try with the Facebook app not installed, with a Facebook account that shares no email, and cancel from the Facebook screen (it should just return to the login screen).

## How the apps look on a phone

- **Notch, status bar and home indicator.** The app build sets `viewport-fit=cover`, so pages draw edge to edge and `env(safe-area-inset-*)` is real. Two CSS variables carry it, `--safe-top` and `--safe-bottom` (`src/index.css`; both are `0px` in a normal browser, so the website is unchanged). Any new bar pinned to the top or bottom of the screen adds them to its own padding: `pt-[var(--safe-top)]` on a sticky header, `pb-[var(--safe-bottom)]` on a bottom bar, `bottom-[calc(4rem+var(--safe-bottom))]` for something that floats above one. The Academy expiry banner covers the notch itself and sets `--safe-top` to `0px` while it shows, so the headers under it don't pad twice.
- **Status bar icons** follow the page's light/dark, not the phone's setting (`src/lib/nativeChrome.ts`).
- **App icon.** The Bitdoin mark only, no wordmark, on white (iOS has no transparency; Android uses it as an adaptive icon). The sources are the PNGs in `assets/`. After changing one, regenerate every size:
  `npx @capacitor/assets generate --ios --android --assetPath assets --iconBackgroundColor "#ffffff" --iconBackgroundColorDark "#ffffff" --splashBackgroundColor "#12294a" --splashBackgroundColorDark "#12294a"`
  `assets/brand-mark.png` is the mark with a transparent background; `src/assets/native-splash-mark.png` is a copy of it for the opening screen.
- **Opening screen.** The native launch image (`assets/splash.png`: navy, white medallion with the mark) shows first. When the web app has painted its own copy of the same picture, it drops the native one and the animation plays (glow, rings, glint, name) for about two seconds before the app opens (`src/lib/nativeSplash.ts` and `.css`). Phones set to "reduce motion" get a still version. If that code ever fails, the native splash hides itself after 5 seconds (`capacitor.config.ts`).
- **Swipe back.** Swiping in from the left edge goes back one page (`src/lib/nativeBackSwipe.ts`). It does nothing on the first page the app opened, so it never leaves the app. Android's own back gesture works as well.

## Version numbers

The version name comes from `version` in `package.json`. The build number is the workflow run number, so every upload is higher than the last.

## Local builds

`npm run cap:sync` builds the web bundle in native mode and copies it into `android/` and `ios/`. Opening them needs Android Studio (Android) or a Mac with Xcode (iOS).
