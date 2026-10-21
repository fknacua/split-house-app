# Implementation plan progress log

## 2026-10-18: 0.1 🔄

Checked the Accordion code: the only opacity class in `accordion/index.tsx` is `data-[disabled=true]:opacity-40` on the trigger, so nothing dims row amounts unless an item is disabled. The remaining check (row amounts not visibly dimmed on the dev build) needs Francis's eyes on the device, so the step waits for his confirmation.

## 2026-10-18: 0.1 🔄 (cause found, waiting on a decision)

Francis's screenshot showed the person-row total amounts in the Accordion header nearly invisible in dark mode. The cause is not in the accordion component: `text-sheet` in `screens/home/index.tsx` (the amount) and `add-charge-sheet.tsx` (the title) matches both the font-size token `--text-sheet` and the colour token `--color-sheet` (the sheet background), so the text takes the sheet background colour and `text-foreground` loses. Question asked: how to fix it (rename the size token or work around it in the screens).

## 2026-10-18: 0.1 ✅

Francis approved closing 0.1 at his request. Accordion rows open and close on device; the accordion component needs no change. The dimmed row totals come from the `text-sheet` size/colour clash in the spike Home screen. Decision: handle it when Home is rebuilt (Phase 5, step 5.3) instead of patching the spike. Carry-over: the same class is used in `add-charge-sheet.tsx` (replaced in 9A.2), so avoid `text-sheet` in new screens until the clash is resolved.

## 2026-10-18: 0.2 🔄

On device the sheet opens and follows swipe gestures, but the Android back gesture closed the app. Added a `BackHandler` listener in `BottomSheetPortal` (`components/ui/bottomsheet/index.tsx`) that closes the sheet and swallows the back press while it is open. Type check shows no new errors in that file; the one lint error there (`JSON.stringify` in the memo deps) was already present. Still to confirm on device: back gesture, snap points, keyboard handling, scrim backdrop, 28px radius, grabber colour.

## 2026-10-18: 0.2 ✅

Francis confirmed the bottom sheet on device after the back-gesture fix. Also cleared the `JSON.stringify` lint error in the sheet wrapper (moved to a `snapPointsKey` variable).
## 2026-10-18: 0.3 🔄

Added textarea, alert-dialog, radio, divider and popover with the gluestack CLI (the CLI rewrote `.npmrc` line endings only; reverted). No new dependencies were needed, and an Android bundle export succeeds with no missing `@react-aria`/`@react-stately` peers. The type check shows only the usual deep-type errors inside `components/ui/*` (including popover). Added a temporary dev page `app/src/app/__verify.tsx` with Select, DateTimePicker, Switch, Menu, Textarea, Radio, Popover and AlertDialog; waiting for Francis to check each on the device (open `/__verify`), in both themes. Delete the page once the Phase 2 test page exists.

## 2026-10-18: 0.3 🔄 (fixes made, waiting on approval)

Francis's device checks found a Select padding problem (padding on the plain TextInput is ignored on Android) and an invisible Radio selection. Select padding now sits on the trigger (`select/index.tsx`) and the input fills the trigger; the verify page's Radio now includes the selection dot. Decision: keep the temporary `__verify` page and its Home link until after Phase 0 (replaces the earlier plan to delete it when the Phase 2 test page exists).

## 2026-10-18: 0.3, 0.4 ✅

Francis confirmed on device that Select, DateTimePicker, Switch, Menu, Textarea, Radio, Popover and AlertDialog all work (0.3), and that Google sign-in is done (0.4, his manual setup and device test). The temporary `__verify` page stays until after Phase 0.

## 2026-10-18: 0.5 🔄

Replaced the create-expo-app boilerplate in `app/README.md` with the dev-environment steps (dev build, LAN mode, firewall and Wi-Fi troubleshooting, tunnel fallback, env variable names, checks). Waiting for Francis to confirm the dev build connects to Metro from this machine and that the README matches what he does.

## 2026-10-18: 0.5 (marker removed)

Francis asked to remove the 🔄 marker, so 0.5 is back to todo. The README rewrite in `app/README.md` stays in place but is untested and unapproved.

## 2026-10-18: 0.4a 🔄

Reviewed the spike sign-in screen against the 0.4a checklist. It never called `GoogleSignin.signOut()`, so after a rejected account the picker would not reappear; it now signs out of Google when the backend returns an error. Not yet checked on device: the five states, cancel from the picker and picker reappearing after a rejection. There is no session gate yet (that is step 3.2), so a successful sign-in will not leave the screen on its own; that gap goes in the spike findings doc once Francis has tested.

## 2026-10-18: 0.4a ✅

Francis confirmed all sign-in states on device, against a local backend. Fixes made along the way: sign out of Google before each attempt so the account picker always shows, and an allowlist check on every new session in `backend/src/lib/auth.ts` (the old check only ran at user creation). Findings added to the spike findings doc; the missing session gate stays for step 3.2.

## 2026-10-19: 0.5 🔄

The dev build connected to Metro from this machine in LAN mode while testing 0.4a. Added a "Point the app at a local backend" section to `app/README.md` (LAN IP, `.env` values, backend started with `-H 0.0.0.0`, Metro restarted with `-c`). Waiting for Francis to confirm the README matches what he does.

## 2026-10-19: 0.5 ✅, 0.6a 🔄

Francis said "go" after the 0.5 README summary, taken as approval, so 0.5 is closed. For 0.6a, added "Not built in v1, deferred" notes to the Replace bill bullet in the Data Model doc and to the History "unpaid carried" row in `docs/DESIGN.md`, and changed the `design/…` paths in `docs/DESIGN.md` to `docs/design/…`. Nothing was deleted. Waiting for Francis to look over the wording.

## 2026-10-19: 0.5 ✅, 0.6a ✅, 0.6 ✅

Francis approved 0.5 and 0.6a. For 0.6, deleted the two leftover gluestack notes in `components/ui/accordion/` (nothing referenced them), confirmed the `@/*` alias maps to `src/*` in `tsconfig.json`, and added a `typecheck` script next to the existing `lint`.

## 2026-10-19: 0.5 🔄 (correction)

Francis said 0.5 is still in progress, so the ✅ set in the previous entry was wrong and is reverted to 🔄. The earlier "0.5 ✅" lines in this log are superseded. 0.6a and 0.6 stay ✅.

## 2026-10-19: 0.5 ✅

Francis confirmed 0.5 is done. The README sections for LAN mode and the local backend stand as written.

## 2026-10-19: 0.7 🔄

Compared the design `config.ts` and `global.css` with the app copies by value. `config.ts` is identical (49 variables per theme), and the app's `global.css` light, dark (media query) and `:root.dark`/`:root.light` blocks match the design values exactly. The only differences are in the `@theme` block: font names use double quotes instead of single, and the `--text-*--line-height` companions are unitless ratios (1.1765, 1.3333, ...) instead of px (40px, 32px, ...); the ratios equal the px values at each font size. The `bg-warning-tint`, `text-on-danger-tint` and `rounded-field/card/sheet/alert` tokens exist in the app's `@theme`; I did not render them on device. Question for Francis: keep the unitless line heights or switch the app to px to be literally identical.

## 2026-10-19: 0.7 ✅

Francis decided to keep the app's unitless line heights (same sizes as the design's px values) and approved the step. No theme files were changed.

## 2026-10-19: 0.8 ✅

Francis confirmed on device that the app follows the phone's light/dark setting. He also reported the Add charge sheet title white in light mode: the `text-sheet` size/colour clash noted under 0.1. As a stopgap, the spike Add charge title and the spike Home person totals now set the 20/28 size through `style` instead of the `text-sheet` class, with no token changes. The rename-or-avoid decision for the token is still open and gets settled when Home and Add charge are rebuilt (5.3, 9A.2).

## 2026-10-19: text-sheet rename

Francis disliked the inline-style stopgap, so it is reverted. The font-size token `--text-sheet` is renamed `--text-sheet-title` in `app/src/global.css` and `docs/design/global.css` (value unchanged), and the Add charge title and Home totals use `text-sheet-title`. `sheet` was the only name defined in both the `--text-*` and `--color-*` groups, so no other class clashes. The earlier log lines about avoiding `text-sheet` are resolved.

## 2026-10-19: Phase 0 ✅

Wrote the Phase 0 summary into the spike findings doc. All Phase 0 steps are done; Francis asked to close the phase.

## 2026-10-21: 1.1 ✅

Added the Prisma models and enums from the Data Model (Person, HouseholdVersion, Month, Bill, BillFile, BillDraft, Charge, ChargeGroup, MessageEvent, Task, Settings) plus a TaskType enum for Task.type. Money fields are Int cents, date-only fields use `@db.Date`, and months are plain `YYYY-MM` strings with indexes (no foreign key to Month). Migration `domain_models` applied via the direct URL; schema validates and the backend type check passes.

## 2026-10-21: 1.2 ✅

Added the zod schema for `HouseholdVersion.config` in `backend/src/lib/household/config.ts` with `HOUSEHOLD_SCHEMA_VERSION = 1`, cross-field checks (one owner, splits add to 100%, tenant shares within totals, valid routes and people references) and a `parseHouseholdConfig` that rejects unknown schema versions. Also added the Nov 2026 config fixture (`src/lib/fixtures/household.ts`, fictional names), vitest (with vite, which vitest 5 needs as a peer) and `test`/`typecheck` scripts. 9 tests, type check and lint pass. Waiting for Francis to review the config shape, mainly the reading that owner and primary tenant take the remainder of each category by basis points while tenants hold fixed rent, shares and units.
Verified the household config zod schema, its unit tests, and the Nov 2026 fixture already committed in 9acf839 — cross-checked every fixture number (rent, utility/aircon shares, deposit, recurring charge, remainder basis points) against the Data Model doc's Nov 2026 table and they reconcile. Hit a blocker running the backend's checks: `npm install` failed with an ERESOLVE conflict (vitest@5 peer-requires `@types/node@^22||>=24`, backend declared `^20`). Francis bumped `@types/node` to `^22` and ran the install and checks himself; tests, typecheck and lint all passed. Marking 1.2 done on that basis.

## 2026-10-21: 1.3 ✅

Added the pure split engine (`backend/src/lib/split/engine.ts`): `splitByShares`, `splitByUnits`, `splitCustom` with their hard checks, plus `buildMonthCharges` (rent + recurring) and `buildUtilitiesCharges` (bill-driven utilities split), all following the half-up/Francis-gets-remainder rounding rule. Unit tests cover every number in the plan's checklist — the utilities and aircon fixture sums, landlord rent 430000, Primary's message total 190865, and the three grand totals (186286/10079/183536) — plus the hard-check error paths. Tests (26 total), typecheck and lint all pass.

## 2026-10-21: 1.4 ✅

Added `backend/src/lib/now.ts` (the `DEV_NOW`-honouring clock, with tests) and `VERSION_A_CONFIG` (Aug-Oct 2026, slightly different rent/shares from the Nov fixture) to `backend/src/lib/fixtures/household.ts`. Wrote `backend/prisma/seed.ts`, wired as the Prisma seed command (`prisma.config.ts` `migrations.seed`, run via `tsx`) and exposed as `npm run seed:reset`; it refuses to run when `NODE_ENV === "production"` (Francis chose a NODE_ENV-only guard over an explicit dev-branch host check or a Neon API lookup, since there's no documented way to identify the dev branch from the connection string) and always wipes the domain tables (never the Better Auth tables) before reseeding. Seeds Aug/Sep/Oct 2026 on version A (Aug fully paid and settled; Sep fully paid but corrected in October via a `correctsMonth` charge; Oct has Sam's rent short-paid by $20 and Jordan's rent left unpaid) plus Nov 2026 on version B with rent/recurring only (no bill, so Home starts in `upload`) — all built through the Phase 1.3 engine functions. Ran it against the dev DB (Francis confirmed) and verified row counts and the payment-state fixtures directly via Prisma. Tests (29 total), typecheck and lint all pass.

## 2026-10-21: 1.5 🚫

No code written yet. Checked the Next.js 16.4 docs and `next.config.ts`: the backend has `cacheComponents: true`, and with Cache Components the route segment config `dynamic = 'force-dynamic'` is removed (the migration guide says to delete it; request-time APIs such as headers and session reads already run at request time). This conflicts with the step's "all route handlers `dynamic = 'force-dynamic'`". Question asked: drop the `dynamic` export (recommended) or turn `cacheComponents` off.

## 2026-10-21: 1.5 🔄

Francis agreed to drop the `dynamic` export. Added `backend/src/lib/api.ts` (`ApiError`, standard error shape, `requireSession` with 401, zod `parseBody`/`parseQuery`, and a `route()` wrapper that maps errors and hides unexpected ones behind a 500), `backend/src/lib/month.ts` (`currentMonth()` in Asia/Singapore, built on `now()`), and `GET /api/health` (request time via `connection()`, pings the database, 503 with `db: "down"` if it fails). 40 tests pass and lint has no errors. The type check fails in `prisma/seed.ts` only, because the generated Prisma client lacks the domain models (not caused by this step); not fixed yet. Health has not been called against a running server yet.

## 2026-10-21: 1.5 🔄 (health route removed)

Francis decided to remove `GET /api/health` until it is actually needed: it was the only public route besides Better Auth, a database ping on a public URL could keep Neon awake, and the client's `ServerUnreachableError` mapping already covers unreachable detection. The plan text still mentions health in 1.5 and 3.6 (Retry would call it first); read those as "Retry refetches the failed queries" until Francis says otherwise. Nothing else changed; the rest of 1.5 stands and the Prisma client regenerate question is still open.

## 2026-10-21: 1.5 ✅

Francis approved closing 1.5. Delivered: `api.ts` conventions (error shape, `requireSession`, zod validation, `route()` wrapper), Singapore `currentMonth()`, no `dynamic` exports (Cache Components), and no health route. 40 tests pass and lint has no errors. The type check still fails in `prisma/seed.ts` because the generated Prisma client is out of date; Francis did not ask for a regenerate, so it is left as is. The auth-guard test was not added.

## 2026-10-21: 1.6 🔄

Added `backend/src/lib/month-open.ts` with `openMonthIfNeeded(db, month = currentMonth())`: in one transaction it returns an existing Month untouched, otherwise pins the newest household version starting on or before the month and creates the rent and recurring charges through `buildMonthCharges`. A concurrent request that loses on the unique month key gets the winner's row, and with no household version yet it returns null and creates nothing. 7 new tests use an in-memory fake (47 total pass); type check passes, including the real Prisma client fitting the function's parameter type, and lint has no errors. Not yet run against the dev database, and no route calls it yet (Home summary, 5.1, will).

## 2026-10-21: 1.6 ✅

Francis approved 1.6 after a walk-through of the concurrent-request behaviour (the unique month key lets one create win, the rest return its row). Comments in `month-open.ts` were converted to JSDoc and a "Code comments" rule for JSDoc was added to CLAUDE.md. Not yet run against the dev database; the first caller will be the Home summary (5.1).

## 2026-10-21: 1.7, 1.8 🔄

Did 1.7 and 1.8 together at Francis's suggestion. Replaced the boilerplate `backend/README.md` with the conventions and the v1 endpoint table (built vs planned, by phase), and added `GET /api/me` (session email) so the Phase 1 exit can be checked. In the app, added `lib/api.ts` (session cookie from `authClient.getCookie()`, 20s timeout covering the body read, `ServerUnreachableError` for network failure, timeout and 502/503/504, `ApiRequestError` for the standard error shape) and `lib/api-types.ts` (error body, `MeResponse`). App and backend type checks and lint are clean; nothing has been run on a device or against a live server yet. Waiting for Francis's review.

## 2026-10-21: 1.7, 1.8 ✅

Francis approved both steps. After his review the app no longer falls back to a localhost backend URL: `auth-client.ts` throws at launch when `EXPO_PUBLIC_BACKEND_URL` is missing. Francis decided that is enough and no EAS build-time check is added. `GET /api/me` was not exercised on a device.

## 2026-10-21: 1.9 🔄

Installed `@tanstack/react-query` and its ESLint plugin, and added `lib/query-client.ts` (reads retry only on `ServerUnreachableError`, 2 retries with about 1s then 2s waits, 30s stale time, mutations never retry), `lib/query-keys.ts`, an `AppState` focus hook, and `QueryClientProvider` in `_layout.tsx`. No network-status package was added, since the app is online-only. `useMe()` calls `GET /api/me`; at Francis's request `useMonthSummary` returns a mock promise with a comment naming the real route (`GET /api/months/:month/summary`, step 5.1), backed by a placeholder `MonthSummaryResponse` type. The type check is clean outside `components/ui`, and lint reports no problems in the new or changed files; the remaining lint errors are all inside `components/ui`. Not yet run on a device. Waiting for Francis's review.

## 2026-10-21: 1.9 ✅

Francis approved 1.9 without a device check (`useMe()` is not called from any screen yet) and asked for a commit.

## 2026-10-21: 1.10 ✅

Decision step, no code. Confirmed the app has no global state library, server data sits in TanStack Query (1.9), and the theme Context (2.1a) and session gate (3.2) come in their own steps. Francis approved.

## 2026-10-21: 1.11 🔄

Added `react-hook-form`, `zod` (same major as the backend) and `@hookform/resolvers` to `app/`, plus `lib/schemas/common.ts` with the shared building blocks: month key, integer cents (any and positive), E.164 phone and required text, each mirroring the backend rule. The Phase 2 field components (2.2) that take `control`/`name` are not part of this step. Type check and lint are clean outside `components/ui`; a Node smoke test confirmed the resolver import and the month and phone patterns. Not yet bundled for the device. Waiting for Francis's review.

## 2026-10-21: shared schemas package noted

Francis asked to keep the hand-mirrored zod schemas (1.11) for now and to note that a shared package is needed before v1 go-live, to be done once tests are in place. Added as step 12.5e in the plan (spike with npm workspaces, then check Vercel, Metro and EAS). Steps 1.8 and 1.11 now carry a note pointing to 12.5e.

## 2026-10-21: 1.11 ✅

Francis approved 1.11 and asked for a commit. After review, the money messages in `schemas/common.ts` use plain dollar wording (the UI never says "cents") and the phone rule is zod's built-in `z.e164()`, any country, format only, with no extra dependency. Type check and lint are clean outside `components/ui`. Open for later: the PhoneField in 2.2 should start with an editable `+65` instead of a fixed prefix, and a contact picker (`expo-contacts`) is a possible Phase 4B addition; neither is written into the plan yet.

## 2026-10-21: plan wording and temporary useMe log

At Francis's request, the PhoneField wording in 2.2, its test-page line and 4B.3 now say it starts with an editable +65, checked with `z.e164()`. `expo-contacts` is not added. Added a temporary `useMe()` call on the Home route (`app/src/app/index.tsx`) that logs the `/api/me` response or error to the console, for the Phase 1 exit check on the device; remove it with the session gate (3.2).

## 2026-10-21: Phase 1 ✅

Phase 1 exit check passed: on the device, against the local backend, the temporary `useMe()` log showed `GET /api/me` returning the signed-in account's email. The earlier "Sign-in failed" was the app pointing at a stale LAN IP in `app/.env` (the PC's address had changed), not a code problem; no code change was needed. The temporary logs in the Home route and the sign-in screen are removed. All Phase 1 steps are done, engine tests pass and the dev database is seeded.
