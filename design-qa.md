# Academy header controls

final result: passed

Source visual: the user-supplied screenshot in this conversation, 720 × 156 pixels (a cropped, approximately 2× view of the Academy home header controls).

Implementation evidence:

- `.gstack/academy-header/learn-desktop.png` — 1440 × 64 pixels.
- `.gstack/academy-header/learn-mobile.png` — 375 × 64 pixels.
- `.gstack/academy-header/coach-mobile.png` — 375 × 64 pixels.
- `.gstack/academy-header/top-corner-lab-desktop.png` — 1440 × 64 pixels.
- `.gstack/academy-header/results.json` — browser checks.

Screenshots use deviceScaleFactor 1. Desktop viewport: 1440 × 900 CSS pixels. Mobile viewport: 375 × 812 CSS pixels. The source is a header crop; compare its controls at approximately half the source pixel size against the implementation. Existing page-specific header heights and container widths are retained.

## Findings

No actionable P0/P1/P2 findings remain.

- Typography: the shared controls retain the Academy home's existing font, 12px bold labels, and Lao font fallback. Page titles truncate without covering the controls.
- Spacing: controls share one horizontal group, 40px buttons, and the existing 44px circular avatar. At narrow widths the platform link becomes a labeled icon button and the language text hides below 420px.
- Colors: muted platform label, slate language control, amber sun in dark mode, and the existing dark Academy surface match the reference treatment. Light mode remains supported.
- Assets: the existing Lucide language, sun, and moon icons and the real account avatar are reused. Browser fixtures use the local brand image as their avatar; the reference person's portrait is account data, not a replacement asset.
- Copy: platform switching, target language, theme action, and profile access follow the reference. Guest pages retain authentication actions.

The full header captures were reviewed against the supplied reference. The header-only captures also provide the focused comparison: control order, icon sizing, label weight, color, and avatar shape are clearly visible without a separate detail crop.

## Validation

Local Playwright used browser-only authentication and API fixtures, leaving production account data untouched. Checked all 13 member routes, including category and lesson readers, plus the public landing page, careers, lab, and subscription page. Checked English and Lao layouts from 320px through 1440px, theme switching in both directions, language switching, profile opening, and Escape dismissal. No browser runtime exceptions occurred.

TypeScript and ESLint passed for the changed source files. The production build passed, including prerendering all 11 configured routes. A focused follow-up checked browser console errors on Learning Hub, Coach, Top Corner Lab, and guest pages; none occurred (`.gstack/academy-header/console-results.json`). Screenshots show no remaining control overlap or clipping. Existing unrelated workspace changes were preserved.

## Comparison history

- Added the shared controls to the existing Academy headers.
- Matched the Learning Hub and Coach dark header surfaces to the Academy home and allowed narrow-screen titles to truncate.
- Reviewed the rendered desktop and mobile captures; the English and Lao browser checks passed.

## Follow-up polish

None required for this change. Authentication and backend workflows were simulated for UI checks and were not exercised against a real member account.
