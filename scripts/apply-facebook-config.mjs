// Puts the Facebook app settings into the iOS and Android projects, for "Continue with Facebook"
// in the apps (Docs/mobile-app-setup.md). The projects keep placeholders so the values are not in
// git; the Mobile apps workflow runs this before building. Locally:
//   FACEBOOK_APP_ID=... FACEBOOK_CLIENT_TOKEN=... node scripts/apply-facebook-config.mjs
//
// Neither value set: nothing to do (Facebook sign-in in the app then uses the browser).
// Only one set: an error, so a half-configured build is never made.
import { readFileSync, writeFileSync } from 'node:fs'

const appId = (process.env.FACEBOOK_APP_ID ?? '').trim()
const clientToken = (process.env.FACEBOOK_CLIENT_TOKEN ?? '').trim()

if (!appId && !clientToken) {
  console.log('No Facebook app settings: Facebook sign-in in the app will use the browser.')
  process.exit(0)
}
if (!appId || !clientToken) {
  console.error('::error::Set both the FACEBOOK_APP_ID variable and the FACEBOOK_CLIENT_TOKEN secret, or neither.')
  process.exit(1)
}
if (!/^\d{8,20}$/.test(appId)) {
  console.error('::error::FACEBOOK_APP_ID should be the numeric App ID from the Meta app (Settings > Basic).')
  process.exit(1)
}
if (!/^[0-9a-f]{20,64}$/i.test(clientToken)) {
  console.error('::error::FACEBOOK_CLIENT_TOKEN should be the Client token from the Meta app (Settings > Advanced).')
  process.exit(1)
}

const files = ['ios/App/App/Info.plist', 'android/app/src/main/res/values/strings.xml']
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const next = text.replaceAll('__FACEBOOK_APP_ID__', appId).replaceAll('__FACEBOOK_CLIENT_TOKEN__', clientToken)
  if (next === text) {
    console.log(`${file}: no placeholders left (already filled in).`)
    continue
  }
  writeFileSync(file, next)
  console.log(`${file}: Facebook app settings applied.`)
}
