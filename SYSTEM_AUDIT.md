# Bitdoin System Audit

Date: 2026-07-25  
Scope: React/Vite/PWA frontend, Supabase schema and Edge Functions, Cloudflare Worker, Bookstore, Academy, and admin surfaces.

## Overall verdict

Bitdoin has a solid product foundation: platform-aware routing, route-level code splitting, database-side checkout pricing, broad RLS coverage, private payment proofs, reusable UI primitives, bilingual support, and separate admin/customer experiences.

The next improvement cycle should prioritize security and reliability before adding more features. The highest-return work is:

1. fix guest-cart RLS and authenticate WhatsApp webhooks;
2. update vulnerable dependencies and replace the stale Worker tests;
3. add error boundaries and flow-level tests for login, checkout, payment proof, and admin approval;
4. improve accessibility by restoring browser zoom and eliminating blank loading states;
5. reduce broad Supabase queries and split the largest page components.

## Priority matrix

| Priority | Area | Finding | Outcome |
|---|---|---|---|
| P0 | Security | Guest cart RLS exposes all carts with non-null sessions | Prevent cross-visitor data access/mutation |
| P0 | Security | WhatsApp POST webhook has no signature verification | Prevent forged events and log abuse |
| P1 | Security | 10 main-app and 7 Worker-tooling dependency advisories | Remove known vulnerable packages |
| P1 | Reliability | Worker test suite is stale and both tests fail | Restore deploy confidence |
| P1 | UX/A11y | Browser zoom is disabled | Restore WCAG-friendly magnification |
| P1 | Reliability | No application error boundary | Avoid whole-screen failure on page exceptions |
| P1 | Auth UX | OAuth does not preserve Bookstore/Academy intent | Return users to the expected platform |
| P2 | Performance | 28 broad `select('*')` queries and large admin/Academy screens | Reduce payload, parsing, and rerender cost |
| P2 | UX | Several auth-loading routes render a blank screen | Show stable branded loading feedback |
| P2 | UX | Native confirm dialogs and inconsistent destructive flows | Improve clarity and accessibility |
| P2 | Maintainability | Multiple files exceed 1,500 lines | Reduce regression risk and simplify optimization |
| P3 | PWA UX | Immediate service-worker activation can interrupt edits | Avoid losing in-progress admin work |

## Performance review

### What is already good

- All primary routes use `React.lazy` (`src/App.tsx:14-55`).
- React Query applies a two-minute stale time and one retry (`src/App.tsx:57-61`).
- Vite uses explicit vendor chunking for charts, Supabase, DOMPurify, and html2canvas (`vite.config.ts:44-57`).
- Public static assets total only about 0.71 MB.
- Production minification and PWA precaching complete successfully.

### Verified optimization opportunities

1. **Initial JavaScript is still substantial.** Current raw chunks include React vendor 502 KB, Supabase 207 KB, and app index 151 KB. The production build reports a 514 KB React vendor chunk. Measure whether AuthProvider makes Supabase part of every initial route; if so, the initial app path likely pays for approximately 250+ KB gzip before route content and fonts.

2. **Charts are a large optional chunk.** `charts` is 366 KB raw / about 102 KB gzip. It is correctly split, but admin analytics should lazy-load individual charts below the fold and avoid importing chart components through broad shared modules.

3. **Academy feature chunks are heavy.** Coach is about 226 KB raw / 72 KB gzip; Subscription is about 75 KB raw / 21 KB gzip. Defer Markdown/AI-coach dependencies until the coach is opened and split onboarding, member home, payment, and profile panels.

4. **Broad database reads are common.** There are 28 `select('*')` calls in `src`, including profile, premium admin, learning, catalog categories, settings, and order details. Select explicit columns, paginate admin tables, and avoid fetching answer keys or unused media fields.

5. **Large components increase render and regression risk.** `Subscription.tsx` is 1,742 lines and `AdminDashboard.tsx` is 1,597 lines. Split data hooks from presentational sections; memoize expensive derived lists only after measuring.

6. **Google Fonts are render-blocking external CSS.** The app requests three font families with five weights each (`index.html:23-25`). Self-host WOFF2 subsets or reduce weights/families, then preload only the critical font.

7. **PWA update behavior is aggressive.** `autoUpdate`, `skipWaiting`, and `clientsClaim` can replace the running app during admin edits (`vite.config.ts:11`, `vite.config.ts:28-29`). Prompt for refresh and track dirty forms.

### Core Web Vitals

No values are reported. Chrome DevTools performance tracing is not configured in this session, so LCP, INP, CLS, TBT, FCP, Speed Index, caching headers, and request waterfalls remain unmeasured. Do not treat bundle sizes as substitutes for field or lab metrics.

Recommended measured routes:

- `/` platform selector, desktop and 390 px mobile;
- `/bookstore`, catalog search, book detail;
- checkout through confirmation, with a receipt image;
- `/academy/home`, learning hub, coach;
- `/admin` and `/academy-admin`, including populated tables.

## Security review

The detailed report is in `security_best_practices_report.md`.

Top actions:

1. replace the guest-cart policies (`supabase/migrations/001_initial_schema.sql:401-404`);
2. validate `X-Hub-Signature-256` and stop logging webhook bodies (`bitdoin-api/src/index.ts:58-68`);
3. upgrade dependencies based on reviewed lockfile changes;
4. add response security headers at an edge/CDN;
5. add idempotency and rate limits to notification email functions.

## UX/UI and accessibility review

### Bookstore

**Healthy:** Product discovery, price comparison, cart, guest checkout, order tracking, payment proof, profile media, and bilingual/currency controls form a coherent marketplace journey. Customer/admin routing is now clearer.

**Improve:**

- The profile page still contains unreachable admin dashboard markup after admins are redirected (`src/pages/customer/Profile.tsx:199-203`). Remove it to prevent future drift.
- Checkout is 535 lines with several asynchronous state transitions. Add an explicit step indicator, preserve entered address/payment values across recoverable errors, and show retry actions rather than only toasts.
- Guest tracking stores normalized phone information in session storage. Explain why phone verification is required and mask it when displayed.
- Use skeletons with reserved image dimensions for book grids to reduce perceived loading and potential layout shift.

### Academy

**Healthy:** Signed-in customers now bypass the marketing page, while admins enter the Academy admin dashboard. Learning, coach, challenges, habits, progress, subscription, and profile have distinct routes.

**Improve:**

- `AcademyLanding` and `AcademyProfile` return `null` while auth loads (`src/pages/academy/AcademyLanding.tsx:10`, `src/pages/academy/AcademyProfile.tsx:11`), causing a blank flash. Use the branded page loader.
- The Academy surface mixes bespoke dark layouts with shared Bookstore controls. Establish a small Academy shell for consistent header, profile menu, loading state, focus styles, and mobile navigation.
- Subscription is a 1,742-line multi-product page. Split first-time onboarding, free home, paid home, subscription purchase, payment review, and member content into explicit states/components.
- The AI Coach should visibly disclose that responses can be incorrect, provide retry/copy/report controls, and preserve drafts on network errors.

### Admin

**Healthy:** Bookstore and Academy operations are separated, permissions are represented in navigation, and dashboard data is route-split.

**Improve:**

- Replace `window.confirm` in Settings, Knowledge, and Learning Admin with the existing accessible modal component (`src/pages/admin/Settings.tsx:316`, `src/pages/admin/Knowledge.tsx:331`, `src/pages/premium/LearningAdmin.tsx:124`).
- Use optimistic updates only where rollback is clear; otherwise disable repeated submissions and show inline success/error near the affected record.
- Add table filters to the URL consistently so operations staff can share/reload views.
- Break `AdminDashboard.tsx` and `AdminOrders.tsx` into sections/hooks and virtualize or paginate populated lists.
- “Profile settings” in Academy Admin currently navigates into the Bookstore admin settings area; introduce a real account/profile settings screen shared by both admin platforms.

### Cross-system accessibility

1. Remove `maximum-scale=1.0, user-scalable=no` from the viewport meta tag (`index.html:17`). It blocks users who need pinch zoom.
2. Audit the 163 `<button>` instances without an explicit `type`; buttons inside forms can accidentally submit.
3. Add a skip-to-content link and consistent landmarks to each application shell.
4. Ensure visible focus states on every custom card/link and test dropdowns/modals with keyboard-only input.
5. Verify contrast for small slate/primary text over gradients and photography.
6. Avoid blank auth-loading states; assistive technology needs a named loading status.
7. Add reduced-motion handling to animated carousels, hover translations, and learning games.

## Reliability and engineering quality

- The production TypeScript/Vite build passes.
- Focused lint checks for the recent routing/profile changes pass.
- Full lint currently fails on two unused disable directives:
  - `src/pages/admin/AdminOrders.tsx:84`
  - `src/pages/admin/Payments.tsx:53`
- The only application test file is for the Cloudflare Worker. Both tests fail because they still expect “Hello World!” while the Worker returns the Bitdoin health JSON.
- There are no automated frontend, Supabase RLS, checkout, authentication, or admin-approval tests.
- No React error boundary is present; a thrown render error can blank the entire SPA.

Recommended minimum test ladder:

1. database/RLS tests for role changes, carts, orders, payments, receipts, and premium access;
2. Worker tests for webhook signature validation and malformed payloads;
3. component tests for auth routing and guards;
4. browser tests for guest checkout, signed-in checkout, proof upload, tracking, admin approval, Academy access, and sign-out;
5. an accessibility smoke test on primary routes.

## Suggested delivery sequence

### Sprint 1 — Security and build trust

- Fix SEC-01 and SEC-02.
- Upgrade safe dependency patches.
- Repair lint and Worker tests.
- Add RLS and webhook tests.

### Sprint 2 — Reliability and accessibility

- Add an application error boundary and consistent loading/error states.
- Restore browser zoom.
- Replace native confirms and audit button types.
- Add the four highest-value end-to-end flows.

### Sprint 3 — Performance and product polish

- Capture real Core Web Vitals/network traces.
- Replace broad Supabase selects and paginate large admin data.
- Split Subscription/AdminDashboard.
- Optimize fonts and service-worker update UX.

## Evidence limits

- No live production URL or authenticated browser session was available.
- The UX review is code-based, not a screenshot-backed product-flow audit.
- Core Web Vitals and runtime accessibility were not measured.
- Production headers, Supabase deployment state, rate limits, and Cloudflare configuration may differ from the repository.

