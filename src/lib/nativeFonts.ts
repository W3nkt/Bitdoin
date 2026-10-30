// Fonts bundled into the iOS / Android apps, so Lao and Thai text never depends
// on the network. The website keeps loading them from Google Fonts (index.html).
// Same family names and weights as that link, so every font stack in the app
// (CSS, inline styles, canvas labels) resolves without changes.
// Loaded only when __NATIVE_BUILD__ is true (src/main.tsx).
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/noto-sans-lao/300.css'
import '@fontsource/noto-sans-lao/400.css'
import '@fontsource/noto-sans-lao/500.css'
import '@fontsource/noto-sans-lao/600.css'
import '@fontsource/noto-sans-lao/700.css'
import '@fontsource/noto-sans-thai/300.css'
import '@fontsource/noto-sans-thai/400.css'
import '@fontsource/noto-sans-thai/500.css'
import '@fontsource/noto-sans-thai/600.css'
import '@fontsource/noto-sans-thai/700.css'
