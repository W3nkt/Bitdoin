# Bitdoin Security Best-Practices Review

Date: 2026-07-25

## Executive summary

The application has several good controls already: Supabase RLS is enabled broadly, checkout totals are recalculated in the database, receipt storage is private, sensitive Edge Functions validate Supabase sessions, HTML shown to customers is sanitized, and CI uses `npm ci`.

Two high-priority defects should be fixed first:

1. guest cart RLS allows any API caller to access any cart with a non-null `session_id`;
2. the WhatsApp webhook accepts and logs unsigned POST payloads.

The dependency trees also contain known advisories. No secrets tracked by Git were found in `.env` or `bitdoin-api/.dev.vars`.

## High severity

### SEC-01 — Guest cart RLS does not prove session ownership

Evidence: `supabase/migrations/001_initial_schema.sql:401`

The `carts_own` policy allows all operations when `session_id is not null`. It does not compare the cart session to a caller-held secret. Because Supabase's anonymous key is public by design, an API caller could query, change, or delete any guest cart whose session field is populated. There is no later migration replacing this policy.

Impact: guest cart contents and metadata can be exposed or altered across visitors.

Recommendation:

- Stop exposing guest carts directly through generic table CRUD.
- Prefer a `SECURITY DEFINER` RPC that accepts a high-entropy session token, stores only its hash, validates ownership, and exposes only the minimum operations.
- If remote carts are no longer used—the current frontend does not query these tables—revoke `anon` access and remove the `session_id is not null` branch immediately.
- Add database-level regression tests proving one guest cannot read or mutate another guest's cart.

### SEC-02 — WhatsApp webhook POST requests are not authenticated

Evidence: `bitdoin-api/src/index.ts:58-68`

The GET verification handshake checks `WHATSAPP_VERIFY_TOKEN`, but POST delivery requests accept arbitrary JSON without validating Meta's `X-Hub-Signature-256`. The complete request body is then written to logs.

Impact: anyone can forge webhook events, consume Worker/log capacity, and place attacker-controlled or personal data in persistent logs. This becomes more severe as message-processing side effects are added.

Recommendation:

- Verify `X-Hub-Signature-256` with an app secret before parsing or acting on the payload.
- Use constant-time comparison.
- Enforce `Content-Type`, a conservative body-size limit, and method-specific rate limiting.
- Log only event IDs/types and redact phone numbers, message bodies, and access tokens.
- Add valid-signature, invalid-signature, replay, oversized-body, and malformed-JSON tests.

### SEC-03 — Known vulnerable dependencies remain installed

Evidence: `package.json:15-43`, `bitdoin-api/package.json:10-16`

`npm audit` reported:

- main app: 10 advisories (5 high, 4 moderate, 1 low), including direct advisories affecting Vite, PostCSS, React Router DOM, DOMPurify, and Vite PWA;
- Worker tooling: 7 advisories (6 high, 1 low), primarily in Wrangler/Miniflare development dependencies.

Some advisories are development-server/tooling-only, but React Router and DOMPurify are shipped application dependencies and should not remain stale.

Recommendation:

- Upgrade DOMPurify and React Router first using a tested lockfile update.
- Plan the Vite/Vite PWA major upgrade separately and regression-test the PWA.
- Upgrade Wrangler and the Workers test pool together.
- Add `npm audit --omit=dev` and a reviewed full audit to CI; use Dependabot or Renovate.
- Do not run `npm audit fix --force` without reviewing breaking changes.

## Medium severity

### SEC-04 — No enforceable security-header configuration is present

Evidence: `.github/workflows/deploy.yml:1-100`, `index.html:1-29`

The app is deployed as static GitHub Pages content, and the repository contains no response-header policy. There is no CSP, clickjacking protection, `nosniff`, referrer policy, or permissions policy in the app shell. Google Analytics and Google Fonts add third-party origins that must be covered by any CSP.

Recommendation:

- Prefer hosting behind an edge that can set response headers.
- Roll out a realistic CSP in report-only mode, then enforce it.
- Set `frame-ancestors 'none'` (or the required allowlist), `X-Content-Type-Options: nosniff`, a conservative `Referrer-Policy`, and a scoped `Permissions-Policy`.
- Inventory third-party scripts and add a consent/privacy decision for Analytics.

### SEC-05 — Notification email endpoints can be replayed

Evidence: `supabase/functions/notify-admin/index.ts:160-220`, `supabase/functions/notify-admin-payment/index.ts:128-230`

Ownership/token checks prevent arbitrary order access, which is good. However, a valid customer or guest token can call notification endpoints repeatedly. There is no idempotency record or request rate limit before sending through Resend.

Recommendation:

- Record notification type plus order/payment ID with a unique constraint.
- Return success without resending when the event has already been delivered.
- Add per-order and per-IP throttling and avoid returning provider error details to clients.

### SEC-06 — OAuth loses the intended platform return path

Evidence: `src/context/AuthContext.tsx:93-102`, `src/pages/Auth.tsx:25-49`

Email/OTP login routes based on the React Router `location.state`, but OAuth redirects only to `window.location.origin`. Router state is not preserved across the external redirect. This is primarily a UX flaw, but unstructured redirect handling tends to become an open-redirect risk if query-driven return URLs are later introduced.

Recommendation:

- Store a strictly validated internal route key (`bookstore` or `academy`) before OAuth.
- Restore only from an allowlist after callback; never navigate directly to an arbitrary URL from query parameters or storage.

## Low severity / defense in depth

### SEC-07 — Service-worker updates can replace the active app immediately

Evidence: `vite.config.ts:11`, `vite.config.ts:28-30`

`autoUpdate`, `skipWaiting`, and `clientsClaim` can activate a new build while an admin is editing a long form. This is more a data-loss/UX risk than a confidentiality risk.

Recommendation: use an update-available prompt or defer activation while unsaved forms exist.

### SEC-08 — Public profile media needs an explicit privacy policy

Evidence: `supabase/migrations/035_user_profile_media.sql:9-25`

The avatar bucket is intentionally public. Public URLs are appropriate for public avatars, but cover/avatar files can expose personal content indefinitely and old uploads are not removed during replacement.

Recommendation: document that profile media is public, delete replaced files, strip image metadata server-side, and consider randomized server-generated object names.

## Positive controls verified

- RLS is enabled across the primary application tables.
- `prevent_unsafe_user_self_update` blocks customers from changing roles and identity fields (`supabase/migrations/043_platform_hardening.sql:17-47`).
- Checkout calculates totals from active server-side prices rather than trusting client totals (`supabase/migrations/022_guest_checkout_and_tracking.sql:90-115`).
- Customer-facing book HTML is sanitized before `dangerouslySetInnerHTML` (`src/pages/customer/BookDetail.tsx:24-31`, `src/pages/customer/BookDetail.tsx:317`).
- Receipt verification and notification Edge Functions perform ownership/session checks.
- CI uses `npm ci` with a committed lockfile (`.github/workflows/deploy.yml:30-36`).

## Review limits

- This was a repository review, not a penetration test.
- Production Supabase policies, deployed Edge Function settings, actual response headers, secrets configuration, abuse controls, and storage bucket state were not queried.
- Live browser/network instrumentation was unavailable in this session.

