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

## Facebook sign-in in the app

In the apps, **Continue with Facebook** uses Facebook's own login SDK instead of the website's redirect flow. What happens next is decided by iOS, not by Bitdoin:

- **The person has allowed tracking**: a classic login. Facebook can switch to the **Facebook app** to approve (when it is installed and signed in) and come straight back. The app shows iOS's "Allow Bitdoin to track your activity…" prompt **once, just before the first Facebook sign-in** (`src/lib/nativeFacebook.ts`).
- **The person has not** (they tapped Don't Allow, or switched tracking off in iOS Settings): the Facebook SDK itself turns the login into **Limited Login**. It runs in the in-app browser, never in the Facebook app (Meta: "Limited Login does not support fast app switch"), and returns an ID token instead of an access token.

Both give the app an ID token that Supabase verifies directly (`signInWithIdToken`, which supports Facebook), so sign-in works either way and needs no extra backend code. The `facebook-native-login` Edge Function (migration 171) is now only a fallback for a result that has an access token and no ID token; it can be removed if it is never needed. If sign-in fails, the message on screen ends with a short reason in brackets; send that.

**The tracking prompt.** Its text is in `Info.plist` (`NSUserTrackingUsageDescription`): "Allowing this lets you sign in by opening the Facebook app. Bitdoin does not use it to show you ads." It is optional for the person: Don't Allow still signs in (in the browser sheet). The permission is used for nothing else: the Facebook SDK's automatic app events and advertiser ID collection are switched off. Bitdoin Academy has students under 18, so keep it that way. Before iOS 17 the Facebook SDK may still treat tracking as off even after Allow, so those phones get the browser sheet.

**iOS first.** The Facebook SDK login is on for **iOS only** for now. Android keeps using the browser for Facebook, because Facebook only accepts an Android build signed with a registered key and there is no fixed signing key until the Play Console release is set up. When that is done: add the Android platform in Meta (below) and remove the `Capacitor.getPlatform() === 'ios'` check in `src/lib/nativeFacebook.ts`.

Until you finish the steps, nothing breaks: without `FACEBOOK_APP_ID` in the build, Facebook sign-in in the apps uses the browser like Google and Apple. (If Google or Apple sign-in in the app shows an error, check Supabase > Authentication > URL Configuration > Redirect URLs contains `store.bitdoin.app://auth/callback`.)

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

**How accounts are matched.** For Limited Login Supabase does the matching: a Facebook person is found by their Facebook ID, or linked to the existing account with the same email (Facebook confirms it, as on the website); otherwise an account is created. Facebook must share an email: without one the person is told to use email or Google. Admin accounts still need their authenticator code as before.

**Store forms.** List Facebook Login (name, email, user ID; used for sign-in) in Apple's App Privacy answers and Google Play's Data safety form. Because the app now shows iOS's tracking prompt, App Store Connect > App Privacy must be answered to match (follow Apple's wording on what counts as tracking; nothing is collected for ads). Apple's review may ask why the prompt is there: the answer is that it lets the Facebook app open for sign-in.

## How the apps look on a phone

- **Notch, status bar and home indicator.** The app build sets `viewport-fit=cover`, so pages draw edge to edge and `env(safe-area-inset-*)` is real. Two CSS variables carry it, `--safe-top` and `--safe-bottom` (`src/index.css`; both are `0px` in a normal browser, so the website is unchanged). Any new bar pinned to the top or bottom of the screen adds them to its own padding: `pt-[var(--safe-top)]` on a sticky header, `pb-[var(--safe-bottom)]` on a bottom bar, `bottom-[calc(4rem+var(--safe-bottom))]` for something that floats above one. The Academy expiry banner covers the notch itself and sets `--safe-top` to `0px` while it shows, so the headers under it don't pad twice.
- **No zoom, and fields stay above the keyboard.** The app build's viewport forbids zooming (`maximum-scale=1.0, user-scalable=no`, in `vite.config.ts`); the website keeps pinch-zoom. On touch screens every text field is forced to at least 16px (end of `src/index.css`), because iOS zooms the page into a smaller one when it is tapped, and that also applies to the website. While the keyboard is up, `src/lib/keyboardAvoidance.ts` sets `--keyboard-inset` and `--visual-height` on `<html>` and scrolls the focused field into view. A full-screen overlay or a bar pinned to the bottom that holds a field should use the `above-keyboard` class, and a bottom sheet should cap its height with `var(--visual-height)` (see `Modal.tsx` and `OnboardingChat.tsx`).
- **Status bar icons** follow the page's light/dark, not the phone's setting (`src/lib/nativeChrome.ts`).
- **App icon.** The Bitdoin mark only, no wordmark, on white (iOS has no transparency; Android uses it as an adaptive icon). The sources are the PNGs in `assets/`. After changing one, regenerate every size:
  `npx @capacitor/assets generate --ios --android --assetPath assets --iconBackgroundColor "#ffffff" --iconBackgroundColorDark "#ffffff" --splashBackgroundColor "#12294a" --splashBackgroundColorDark "#12294a"`
  `assets/brand-mark.png` is the mark with a transparent background; `src/assets/native-splash-mark.png` is a copy of it for the opening screen.
- **Opening screen.** The native launch image (`assets/splash.png`) is the plain navy gradient. The app then plays the opening (`src/lib/nativeSplash.ts` and `.css`): the bookstore's real covers fly through the screen as 3D books for about 4.4 seconds, gather into the middle, and the Bitdoin logo fades in at the centre, then its name; at 7.3 seconds the screen fades to the app. The covers are the newest active books, remembered on the phone so the next launch needs no waiting; if they cannot be loaded, six covers that ship with the app are used. Phones set to "reduce motion" get just the logo. If that code ever fails, the native splash hides itself after 5 seconds (`capacitor.config.ts`). The opening belongs to opening the app: it plays once per launch (the WebView's session storage marks it as played, so a page reload inside the running app skips it), and pulling down to refresh does not reload the page at all. It shows the page's skeleton with the spinning Bitdoin mark and rebuilds the page in place (`RefreshBoundary` in `src/App.tsx`); the web app keeps its plain reload.
- **Swipe back.** Swiping in from the left edge goes back one page (`src/lib/nativeBackSwipe.ts`). It does nothing on the first page the app opened, so it never leaves the app. Android's own back gesture works as well.

## Version numbers

The version name comes from `version` in `package.json`. The build number is the workflow run number, so every upload is higher than the last.

## Local builds

`npm run cap:sync` builds the web bundle in native mode and copies it into `android/` and `ios/`. Opening them needs Android Studio (Android) or a Mac with Xcode (iOS).
