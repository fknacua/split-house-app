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

## 2026-10-22: 2.1a ✅

Added `app/src/lib/theme-preference.tsx` (`ThemePreferenceProvider`, `useThemePreference()`) and wired it into `_layout.tsx` (splash waits for the saved choice, `GluestackUIProvider mode={preference}`, status bar follows the resolved theme). The gluestack provider now maps `system` to `'unspecified'` so System follows the phone again after a forced theme. Storage is `expo-secure-store`, not AsyncStorage: AsyncStorage failed on the existing dev build (no native module) and was removed; the plan allowed either. A temporary Light/Dark/System toggle on Home (marked TEMP 2.1a, remove with the 2.14 test page toggle) let Francis confirm on device that forcing a theme works; he approved the step. Type check and lint are clean outside `components/ui`.

## 2026-10-22: 2.2 ✅

Completed the provider shell in `_layout.tsx`: added `BottomSheetModalProvider` and a `bg-background` View around the Stack, with a marker where the session gate goes in 3.2. The `expo-system-ui` window background from the plan line is left out for now: reading a CSS token from JS needs an unstable NativeWind hook whose types do not match its native version, and the in-app background is already covered by the token class. Revisit (for example with the config.ts RGB values) if a white gap shows behind the keyboard or on the first frame. Type check and lint are clean for the file; not yet run on the device. Francis asked to mark it done.

## 2026-10-22: 2.3 ✅

Added the dev-only test page `app/src/app/__components.tsx` with the pinned theme toggle and a touch-target outline switch, a reusable `TouchTargetCheck` wrapper, and a temporary Home link (remove in 2.13). The first outline version flickered because the border changed the measured size; it is now an overlay. A demo showed the 48px box measuring about 42dp: NativeWind 5 preview ignores `inlineRem: 16` and converts rem at 14, so spacing classes were about 12.5% small. Fixed with `--spacing: 4px` in `app/src/global.css`; Francis re-checked on device and approved. Open: `docs/design/global.css` does not have this line (decision pending), the demo section and its TEMP measured-size readout go in 2.18, and the dialog spacing is handled in 2.15.

## 2026-10-22: 2.4 ✅

Rebuilt the segmented control and chips to the design (joined outlined group and outlined chips, 44px, check icon on the selected item, `disabled` for the saving state, and a `fit` option for Settings' content-width preview sample), and added both sections to the test page. Also added the `--spacing: 4px` line to `docs/design/global.css` and removed the temporary theme toggle from Home. Francis checked it on device and approved. Francis does not like how the single-select chips behave and will revisit that design himself; the chips stay as designed until he says otherwise.

## 2026-10-22: 2.5 🔄

Built the Button and its test-page section (seven variants, default and small sizes, loading, disabled, pressed states). Francis then set the direction: `ui/button` stays the native gluestack button and carries all the looks (variants, sizes, disabled and pressed states, new `on-danger` token added to the theme files and mapping doc), while `components/button.tsx` is a thin wrapper that renames props (`size: 'default' | 'small'`) and adds loading. The ui spinner now only passes `color` when given, so class colours apply. Lint, type check and the device check have not been run on the rebuilt version; Francis will run the checks later, so the step stays in progress. A lint rule against direct `components/ui` imports was discussed for later (around 2.18).

## 2026-10-22: 2.5 ✅

The Button now follows Francis's wrapper rule: `ui/button` is the native gluestack button and holds all the looks (seven variants, two sizes, disabled, pressed and the new `on-danger` token), and `components/button.tsx` only renames props and adds loading. Fixed two bugs found on the device: tailwind-merge was dropping the label colour next to our custom text sizes (now registered in `ui/button`), and the disabled label colour now comes from the style context instead of a data selector. Added an ESLint rule against direct `components/ui` imports, with existing violations marked by a standard TODO disable comment. Francis checked all variants and states on the device and approved. Lint and the type check were not run on this version; Francis chose to do them later.

## 2026-10-22: 2.5 ✅ (checks)

Ran the checks Francis had deferred: the type check shows 4 errors, all in `ui/alert-dialog` and `ui/popover`, and ESLint shows 19 errors, all in `ui/calendar` and `ui/date-time-picker`. These are not from this step: none are in files it touched, and the ESLint totals match the start of the step. The hex grep on the Button files finds nothing. The commit message was amended to say so (now `3ab4a85`, not pushed).

## 2026-10-22: 2.6 ✅

Built the Alert: `ui/alert` is the native gluestack alert with the info, warning, danger and success looks (tint and line tokens, 16px `rounded-alert`), and `components/alert.tsx` is the wrapper that picks the Lucide icon and lays out the title, message and optional buttons. Added an Alerts section to the test page. The first device check showed missing backgrounds and corners because Metro's cache was stale for the new classes; a cleared build confirmed every class and token compiles in both themes, and Francis then approved it on device. The design has no success alert, so it uses the success container colours. Type check and lint are clean for the new files.

## 2026-10-22: 2.7 ✅

Built the Badge: `ui/badge` is the native gluestack badge as a pill with six looks (neutral, primary, success, warning, danger, info) on the container tokens, and `components/badge.tsx` is the wrapper with label, variant and optional Lucide icon. Overdue uses the new danger look, per Francis, who also updated the badge tokens and is exporting new design files to refresh the design refs. Added a Badges and status chips section to the test page, grouped by variant plus a "with icon" group. Type check and lint are clean for the new files; Francis checked it on device and approved.

## 2026-10-22: 2.8 ✅

Built the FormControl wrapper and TextField: `ui/form-control` and `ui/input` now carry the design looks (14/20 bold label with a red required marker, 12/16 helper and error text, 48px field with radius 12, thicker focus and error borders, disabled fill), and `components/form-field.tsx` adds `FormField` and a react-hook-form-bound `TextField` using `Controller`. Added a Form fields section to the test page, including a field validated on blur through the zod resolver. Type check, lint and hex grep are clean; Francis checked invalid and disabled on device and approved.

## 2026-10-22: Design update, Round 2 controls

Francis supplied new designs for the segmented control and the chips. The segmented control is now the connected button group (`ConnectedButtonGroup`): separate buttons with a 2px gap, no outer border, the selected one a `primary` pill, no check icon, 48px high (44px compact for the Settings preview sample). The chips lose the check icon, keep a fixed 1px border and fill with `primary` when selected. Updated DESIGN.md (specs), the mapping doc (custom pieces, radii, `selected` usage), the three source files in `design/source` (AddCharge, Household, Settings) and the plan steps that mention the control (4B.3, 9A.2, 10A.2, 10A.3). Step 2.4 was not reopened; the components were reworked as a separate update. Round 1 (tokens, success alert, error badge) was already in. Add charge is not final, and Household and Settings are not built yet, so only their plan steps changed.


## 2026-10-22: 2.9 🔄

Built the textarea and phone inputs. Francis then set a pattern for all inputs: a bare wrapper over the native input that also takes an optional `fieldControlProps`, which binds it to a react-hook-form field and wraps it in the label-above form field. Added the shared types (a discriminated union of standalone and form-controlled props), the `useFormControlledField` hook, the `withFormControlledField` helper and a barrel in `form-field/`, and moved `TextInput`, `TextareaInput` and `PhoneInput` onto it. Fixed the textarea padding, the test page keyboard covering content, a spread type error in the helper, a circular import in the helper, and a crash caused by the old commented-out `form-field.tsx` shadowing the new folder (the old file is deleted). The ESLint import rule now lets everything under `components/` import `components/ui`. Lint (outside the known `ui/*` errors) and the type check were clean before the last import fixes; the device check of the final version is still to do, so the step stays in progress.


## 2026-10-22: 2.9 ✅

Added `lines` (default 3, the 96px design height) and `maxLines` (default 6) to `TextareaInput`, applied as minimum and maximum heights, so it grows then scrolls inside. Francis checked the final version on the device and approved; there is no scrollbar on the textarea, which is how Android multiline fields behave and was left as is. Lint and the type check were last run before the `lines` change and the import fixes; Francis chose to finish the step without re-running them.

## 2026-10-23: 2.10 ✅

Built `lib/money.ts` (`formatCents`, `parseMoneyToCents`, `centsToInputText`, `sanitizeMoneyInput`; negatives as `-$15.00`) and `MoneyInput`, which holds integer cents and keeps the typed text while focused. Added vitest to `app/` with 39 money tests, the first app lib tests, and made the shared form-field pattern generic for non-string values (`withFormControlledFieldOf`); the text inputs are unchanged. Francis checked it on device and approved. Tests pass, ESLint is clean on the touched files, and the type check shows only the known errors in `ui/alert-dialog` and `ui/popover`. A keystroke-level gate for invalid characters was tried and reverted at Francis's request; invalid input is cleaned in `onChangeText`. The component is named `MoneyInput`, not `MoneyField`.

## 2026-10-23: 2.11 🔄

Built `lib/month.ts` (`monthKeyOf`, `currentMonth`, `formatMonthLabel`, `addMonths`, `monthRange`, `isMonthKey`) on `date-fns` and `@date-fns/tz` (Singapore time) with 23 vitest tests; tests and ESLint pass, tsc not run yet at Francis's request. `isMonthKey` has no caller yet, so step 12.4a was added to remove it before go-live if still unused. No components built yet. `ui/select` has 4 auto-fixable duplicate-import lint warnings, and still needs restyling to the design (48px, radius 12, tokens, and the hex backdrop `bg-[#000]/50` replaced by a token). Open questions for Francis: (1) the plan says months show as "Nov 2026" but `FormControls.dc.html` shows "November 2026", so which one; (2) the selected row in the design has a check icon, which gluestack's `SelectItem` can't draw, so either build our own item (recommended) or skip the check.

## 2026-10-23: 2.11 ✅

Finished the components. Restyled `ui/select` and its sheet to the design with tokens (no hex), built `SelectField` and `MonthSelectField` on the shared form-controlled pattern, and added the Pickers section to the test page. Month labels follow the design ("November 2026") and the plan text was updated to match. Francis chose to skip the check icon on the selected row (gluestack's item can't draw it) and asked for an × clear button, which lives in the `SelectField` wrapper and is not in the design source. `lib/month.ts` was moved onto `date-fns` and `@date-fns/tz` (new dependency `@date-fns/tz`), with 26 tests; it is a candidate for the shared package (12.5e), and 12.4a covers removing `isMonthKey` if still unused. Francis checked it on device and approved. The sheet background looked transparent in one screenshot before a cache clear; Francis approved afterwards. A full tsc run was not done; lint was clean and the tests pass.

## 2026-10-23: 2.12 ✅

Built `Switch` and `SwitchRow` (form-bound or standalone) on the native RN switch with token colours and a 1.2x default size, and `DateField`, a custom field that opens the Android system date dialog directly and takes a `YYYY-MM-DD` value (new `lib/date.ts` with 21 tests). The design draws an outlined switch with a check, which the native switch cannot do, so Francis chose to keep the native switch and make it larger. `ui/date-time-picker` and `ui/calendar` were deleted by Francis because the app is Android only. The x clear button is opt out on `DateField` and opt in on `SelectField` and `MonthSelectField`, and the disabled calendar icon and chevron are greyed, which differs from the design. Tests (80), type check, lint and the hex grep are clean; Francis checked it on device and approved.
