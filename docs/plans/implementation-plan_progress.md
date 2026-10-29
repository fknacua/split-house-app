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

## 2026-10-23: 2.13, 2.13a ✅

Rebuilt the bottom navigation as an expo-router tab bar: `BottomNavBar` renders whatever `items` it is given, `BottomNav` adapts it to the `Tabs` layout (imported from `expo-router/js-tabs`), and the tabs layout owns the tab list, with a dev-only Test tab. Francis moved the tab definitions out of the shared component, and the test page now uses its own mock items, which became a Phase 2 "storybook-like" test page rule. Fixed an Android bug (react-native #52415) where a pill going from transparent to opaque lost its rounded corners, by giving the inactive pill the bar's own colour. Added a shared `Screen` wrapper (background and top safe-area inset) as step 2.13a, used by the four tab routes and the test page, and added it to the per-screen working rules; the bottom padding was raised to 16 plus the inset. Francis checked everything on device in both themes and approved. Checks: VS Code diagnostics clean on the changed files, and `npm run lint` passes with no warnings. The full type check runs at the end of the phase, there are no app tests for these components, and the hex grep matched only an issue number in a comment.

## 2026-10-23: 2.14 🔄

Built `components/app-sheet.tsx` (`AppSheet`, opened and closed through a ref): grabber, 20/28 title with a 44px close button, scrolling body, sticky footer with one action button, and `saving` and `failed` states. Saving shows the button spinner, ignores touches in the body, and locks the close button, swipe-down and scrim tap; failed shows the danger Alert above the footer, turns the action into "Retry" and keeps the body mounted so typed values stay. In `ui/bottomsheet` the sheet now uses the `sheet` background and `rounded-sheet` (no border), the `track` grabber colour and the `scrim` backdrop instead of `background`, `primary` and black. Added a Bottom sheet scaffold section to the test page (idle with a fake save that fails once, saving, failed, a field for the keyboard, a long body). The design has a single action button and no Cancel, so I followed the design (the close button cancels) rather than the plan's "Save/Cancel". Editor diagnostics and lint are clean on the changed files and the hex grep finds nothing (the full type check runs at the end of the phase). Not yet run on device.

## 2026-10-23: 2.14 ✅

Built `components/app-sheet.tsx` (`AppSheet`, opened and closed through a ref): grabber, 20/28 title with an optional subtitle, a scrolling body, and a sticky footer with the main action and a Cancel text button. Saving shows the spinner, ignores touches in the body, and locks Cancel, swipe-down and the scrim tap; failed shows the danger Alert, turns the action into "Retry" and keeps typed values. Francis's newer Record payment and Mark paid designs have no close icon, so it was removed; the design source files in `docs/design/source` are older and Francis will update them. `ui/bottomsheet` now uses the `sheet` background, `rounded-sheet`, the `track` grabber and the `scrim` backdrop. The first version did not scroll because the library's `BottomSheetContent` has no bottom edge, so the frame is now a plain absolute View. Francis checked it on device: the body scrolls and the keyboard does not cover the fields, but it does cover the buttons, which he accepted. The Android back gesture still closes the sheet while saving; Francis chose to leave it, and the test page caption says so. Editor diagnostics and lint are clean (the full type check runs at the end of the phase).

## 2026-10-23: 2.15 🔄

Built `components/confirm-dialog.tsx` (`ConfirmDialog`) on the native alert dialog: round icon, centred 20/28 title, body, optional check or bullet list, a filled safe button and an outlined action (red for danger, neutral for warning). Restyled `ui/alert-dialog` to the `sheet` background, `rounded-dialog`, no border and the `scrim` backdrop, and removed `opacity` from its `ZoomIn.withInitialValues` call, which fixed the type error there. Added a Dialogs section to the test page with Remove person, Remove version, Discard changes and Save with warnings. Francis chose to differ from the design in Save with warnings: the "Check these before you continue:" lead-in is in the full text colour and the bullets are muted, where the design has them the other way round; Remove person keeps the design's muted body. The scrim is 50% in both themes (the token has no alpha; the design's dark theme uses 60%). Editor diagnostics and lint are clean on the changed files and the hex grep finds nothing (the full type check runs at the end of the phase). Not yet checked on device.

## 2026-10-23: 2.15 ✅

Francis checked the Dialogs section on device and approved. Nothing changed since the 🔄 entry: `ConfirmDialog`, the restyled `ui/alert-dialog` and the Save with warnings emphasis swap stand as logged. Editor diagnostics and lint were clean (the full type check runs at the end of the phase).

## 2026-10-23: 2.16 ✅

Built `components/skeletons.tsx` (`SkeletonBlock`, `SkeletonCard`, `SkeletonRowList`, `SkeletonPersonCards`) on the native gluestack `Skeleton` in the `container` colour, matching the loading shapes in `Main.dc.html` and `Household.dc.html`, and added a Skeleton section to the test page. The design shimmer gradient is replaced by gluestack's pulse. Deleted the unused `ui/skeleton/index.web.tsx` (the app is Android only); the other three `.web.tsx` files in `ui/` stay at Francis's request. Also fixed the switches Francis spotted in dark mode: the off track now uses the `track` token (it was nearly the background colour), and disabled switches get 60% opacity so they read differently from enabled ones. Francis checked it on device and approved. Editor diagnostics and lint are clean on the changed files and the hex grep finds nothing (the full type check runs at the end of the phase).

## 2026-10-23: 2.17 ✅

Built the screen headers under `components/screen-header/`: `PageHeader` (24/32 title with an optional trailing control, for tab screens) and `SubpageHeader` (48px back button, 20/28 title, optional subtitle and trailing control, for screens opened from a tab). Back goes through expo-router and falls back to the root when there is no history; `onBack` overrides it. Francis renamed the components from TabHeader/StackHeader and split them into separate files. Added a Screen headers section to the test page and used `PageHeader` for the test page title. Editor diagnostics and lint are clean on the changed files and the hex grep finds nothing (the full type check runs at the end of the phase). Francis approved.

## 2026-10-23: 2.18 ✅

Final pass. Francis checked the existing test-page components as we went, so the comparison against `FormControls.dc.html` was skipped at his request. Added the missing wrappers `Card`, `Spinner`, `Progress` (with `SegmentedProgress` and `SplitProgress`), `Accordion` and `AppProvider`, each with a test-page section (Cards, Progress, Accordion with 3 sample rows, Spinner), and restyled `ui/card`, `ui/progress` and `ui/accordion` to the design. `_layout.tsx` now uses `AppProvider`, which clears its lint disable; `__components.tsx` has none and `__verify.tsx` no longer exists. The bottom nav pill, icon and label now fade like the button group and chips. Deleted the unused `ui/popover`, which removes the three known type errors. Added `index.ts` barrels for `components`, `hooks` and a pure-helpers-only `lib`, and moved 13 call sites onto them (a `ui` barrel was tried and removed). Lint, the hex grep and the full type check pass. 15 `TODO: replace with a wrapper` disables remain in the spike screens (`screens/home`, `screens/sign-in`); they go away when Phases 3, 5 and 9 rebuild those screens. Francis reviewed the page on device and approved; Phase 2 is complete.

## 2026-10-23: 3.1 🚫

Read `SignIn.dc.html`, the spike sign-in screen and the shared components; no code written yet. Blocked on one conflict: the source draws the Google button with Google's own hex colours (button background, text, border in light and dark, and the four-colour logo), but CLAUDE.md says token classes only, never hex. Asked Francis whether to allow a single, commented hex exception confined to one Google button file, or use the native `GoogleSigninButton` instead.

## 2026-10-23: 3.1 🔄

Francis will supply the Google G logo as an image asset, so the button is built without it for now. The button uses the `surface`, `outline` and `on-surface` tokens (close to Google's own light and dark colours), so there is no hex. Rebuilt the Sign in screen as a pure `SignInView` (five states, copy from `SignIn.dc.html`) with a container that keeps the Google and Better Auth calls, cancel handling and `signOut()` on rejection. Added `GoogleButton` and `Icon` wrappers, a `reason=ended` route param for the session gate (3.2) and a dev-only `__gallery` route linked from the test page. The spike's lint disable on this screen is gone. Editor diagnostics and lint are clean (the full type check runs at the end of the phase); the one open diagnostic is the typed route `/__gallery`, which Expo regenerates when Metro restarts. Waiting for Francis's device review.

## 2026-10-23: 3.1 ✅

Francis checked the Sign in screen on device and approved. Changes since the 🔄 entry: the Google G logo is now the `assets/images/google.svg` asset in `GoogleButton`, and the house tile is replaced by the animated squircle app icon (`assets/images/app-icon/*-loop.webp`; the SVG loops don't animate on Android, so the WebP is used). The circle, square and squircle loops are added as SVG and WebP for later use, and matching the system icon shape is deferred; squircle for now. Editor diagnostics and lint were clean on the changed files (the full type check runs at the end of the phase).

## 2026-10-23: 3.2 🔄

Added `app/src/lib/session.tsx` (`useSession()`, `endSession()`, `useSessionEnded()`). The root layout now picks between Sign in and the app with `Stack.Protected`, and renders nothing while the first session lookup runs. A 401 from any query or mutation (`QueryCache`/`MutationCache` `onError` in `query-client.ts`) signs out locally, clears the query cache and shows Sign in in its `ended` state; the ended flag is a small store the route reads, and the `reason=ended` param still works. The spike's temporary Sign in link on Home is gone. Lint passes and a filtered type check shows no errors in the changed files. Not yet checked on device: first load signed out lands on Sign in (sessions were cleared in the dev database), sign-in lands on the tabs, a revoked session shows "Your session ended".

## 2026-10-23: 3.2 🔄 (device checks mostly done)

On device the gate works: signed out lands on Sign in, the wrong Google account shows the "can't use the app" alert, the allowed account signs in. Three problems came up along the way. Better Auth's `useSession()` was hitting the optional `expo-network` import when its store mounted, which logged "error during concurrent rendering"; `expo-network` is now installed (needs the new EAS dev build for the native part). The Sign in screen lost its state when Better Auth set `isPending` on refetch, so `useSession()` now latches `pending` to the first answer. Sign-in then failed with no error because the app was pointed at the production Vercel API, whose Neon production database had never been migrated (step 12.6 is the first planned production migration) and which had Vercel Authentication on; both were fixed by hand (`prisma migrate deploy` against the production direct URL, protection off). Temporary debug logs are removed. Not yet checked: the "Your session ended" path after a 401, since no screen calls the API yet.

## 2026-10-23: 3.2 🔄 (auth error handling)

Reproduced the silent sign-in failure locally with an empty scratch database: `POST /api/auth/sign-in/social` returns a 302 to `/api/auth/error?error=internal_server_error`, the phone follows it and sees a 200 page. `get-session` returns a real 500 on a database error, but the gate ignores Better Auth's `error` and treats it as signed out (to be handled with the server-error prompt in 3.6). Kept two guards: the Auth route converts a 3xx whose `Location` has an `error=` value into the standard JSON error (500 for `internal_server_error`, 400 for other codes), and the Sign in screen requires a `user` in the sign-in response, plus `apiFetch` rejects a non-JSON success body as unreachable. Better Auth stays (no match found in its docs or issues; it is documented behaviour for browser flows). Not yet verified: the converted 500 against the scratch database, and the "Your session ended" path.

## 2026-10-23: 3.2 ✅

Francis verified the session gate and the auth error handling on device and approved: signed out lands on Sign in, the wrong account shows the alert, the allowed account reaches the tabs, and a failed sign-in (empty scratch database) now returns a 500 from the backend and "Couldn't sign in" in the app. The "Your session ended" path was not exercised on device (nothing calls the API yet); the 401 handler is in place for Phase 5. The `get-session` 500 still reads as signed out until the server-error prompt in 3.6. App changes are committed on `phase-3`; the backend wrapper goes up as its own PR off `origin/main`.

## 2026-10-23: 3.3 ✅

The Sign in container now calls `authClient.revokeOtherSessions()` right after a successful sign-in; if the call fails, the new session is signed out too and the screen shows the failed state. Checked against the production backend and database: with a dummy extra session row in the `session` table, signing in on the phone left one new session and removed the dummy. A second real device being cut off is not tested, since nothing calls the API until Phase 5. Lint passes and editor diagnostics are clean on the changed file (the full type check runs at the end of the phase).

## 2026-10-23: 3.4 ✅

Built the Returning user screen as a pure `ReturningView` (`app/src/screens/returning/`): the title, intro and a three-step checklist Card with copy from `Returning.dc.html`, in two states (`loading`, as drawn, and `reminders`, the next step of the same checklist). It is reachable from the dev `__gallery` (new Screen switcher). Francis's device review found the check too thin, a ringed spinner, markers narrower than 28px and a marker that turned square when a step changed state; fixed with a `strokeWidth` prop on the Icon wrapper, a bare spinner, fixed 28px markers and a separate element per state. Also widened the native icon's props type to accept a numeric `size` and `strokeWidth` (an existing type error). Francis approved on device. Not done here: the container that fetches `/api/bootstrap` and routes to the tabs or First run is left for 3.5, because the endpoint and First run do not exist yet. Lint was clean on the Returning files; the last icon edits were checked with a filtered type check only (the full type check runs at the end of the phase).

## 2026-10-23: 3.5 🚫

No code written. Read the API conventions (`api.ts`, the `/api/me` route), the Data Model, the Settings schema and `Welcome.dc.html`. Blocked on a doc conflict: the plan (4A.1) lists the setup steps as household/people, rent and shares, recurring charges, reminders, but `Welcome.dc.html` has five rows (Rent & rooms, People, Your split, Messages optional, Reminders optional) and counts "of 4"; the Brief has a third list. Neither the Data Model nor the design says how each step is derived from a household version, and `Settings.notifications` is an untyped JSON column with no defined shape. Asked Francis which step list wins, and whether 3.5 should return only `hasHousehold` and `currentMonth` for now, leaving `setupProgress` and `settings` to 4A.4 and 10A.1.

## 2026-10-23: 3.5 🚫 (skipped for now)

3.5 stays blocked on the setup-steps question. Skipped at Francis's request; 3.6 goes first. The Returning screen's wiring waits on 3.5.

## 2026-10-23: 3.6 🔄

Built the blocking "Can't reach the server" prompt: `ServerErrorDialog` (from `ServerError.dc.html`, idle and retrying states, no way to dismiss it but Retry), a small store and Retry logic in `app/src/lib/server-unreachable.ts` with unit tests, and `ServerUnreachableProvider` mounted in the root layout. The query client now raises the prompt when any query or mutation fails with `ServerUnreachableError`; Retry refetches the queries that failed that way and closes the prompt if they all succeed (the health route was removed on 2026-10-21, so Retry does not call it). Added a "Server-unreachable prompt" section to the test page (a real failing query with a "server is down" switch) and a Server screen to the dev gallery. Lint passes, the 6 new tests pass, and editor diagnostics are clean (the full type check runs at the end of the phase). Left open at Francis's request until a real API call exists to test it on; sign-in and the session lookup still do not use it (they show Sign in's own failed state), a call Francis has not made yet.

## 2026-10-23: 3.5 ✅

Added `GET /api/bootstrap` (session required, read-only): `hasHousehold`, `currentMonth` (Singapore), `setupProgress` (the five Welcome rows with `optional` and `done`) and `settings.notifications` (the six Settings toggles, defaults from the design when no row exists). Francis chose the full version and the design's five steps. Done rules were my call and are noted for 4A: Rent & rooms (a rent is set), People (a tenant exists), Your split (a primary tenant exists); Messages and Reminders stay not done because nothing records them yet. Logic is in `backend/src/lib/` (`bootstrap`, `setup-progress`, `settings`) with 10 new tests; backend tests (57) and lint pass. Added `useBootstrap`, the `BootstrapResponse` types and the README row. Francis called it from the app against the local backend and got the response. Not done here: the Returning screen does not call it yet, so there is no routing to First run, and a temporary dev button on Home does the call until then.

## 2026-10-23: 3.6 ✅

Francis verified the blocking prompt on a real API call: offline shows it after the reads' retries, Retry shows the spinner, and once back online Retry closes it and the result fills in without a second tap. An earlier "Retry only dismisses" report was the dev button's query being disabled, which `refetchQueries` skips; the button now enables its query on the first tap. Sign-in and the session lookup still show Sign in's own failed state rather than this prompt. Lint, the new tests and editor diagnostics were clean (the full type check runs at the end of the phase).

## 2026-10-23: 3.7 ✅

Marked done at Francis's word that the device checks were already done while testing 3.2 and 3.6. I did not re-run them and the log does not list which cases were covered.

## 2026-10-23: Plan reorder, Phase 4 onwards

Reordered the plan after a discussion with Francis. New order: Phase 4 History, 5 Home, 6 Bill (without Share), 7 Payments then Recipient and Share, 8 Household with Confirmations and the shared schemas package, 9 Settings then Notifications, 10 First run, 11 Add charge, 12 Hardening and release (still last, only 12.5e left it). Reasons: the dev database seed already covers History and the Home states, so they can be built before any data-entry flow; First run only launches other screens, so it follows them; Add charge is a nice to have because a wrong bill is rare. Home gets a new step 5.0 with seed scenarios (`upload`, `draft`, `unsent`, `collecting`, `dueToday`, `settled`, `aircon-due`). Phases 0 to 3 are untouched.

The plan has a "Build order from Phase 4" section with the old-to-new step map; entries above this one use the old numbers (for example 9A.2 is now 11.2, 12.5e is now 8.0). `backend/README.md` endpoint table updated to the new IDs. CLAUDE.md "Phase 0 to Phase 12" still holds.

Open point for Phase 4: `History.dc.html` has to say what opening a charge opens (4.3); not checked yet.

## 2026-10-24: Shared package (Phase 3.5), done before Phase 4

Francis asked to do the shared lib before History so response types are defined once. Pulled 8.0 forward as Phase 3.5. Discarded the unstarted History work (stashed as `stash@{0}`, drop when sure) and branched `shared-package` from `main`.

- npm workspaces (`backend`, `app`, `shared`), one root `package-lock.json`, `overrides` moved to the root. Backend `react` and `react-dom` pinned to 19.2.3 to match the app (Next 16.4.1 accepts any 19.x; Expo says duplicate React breaks the app). `app/.npmrc` (`legacy-peer-deps`) is now ignored by npm; the install works without it.
- The fresh install floated versions versus the old lockfiles (`@gluestack-ui/core` 5.0.0-alpha.0 to 5.0.15, `nativewind` preview.2 to rc.0, `expo` 57.0.30 to 57.0.31 and a few `expo-*` patches, `better-auth` 1.7.9/1.7.10 to 1.7.12). `expo install --check` and `expo-doctor` pass; Francis checked the UI on the device and it is fine, so the new lockfile is kept.
- `shared/src`: `api/` (bootstrap, error, me), `schemas/` (primitives, household-config, settings, setup), `lib/` (date, money, month). Moved from the backend: household config and settings. Moved from the app: month, date, money, their tests, form primitives and the response types. Backend `month.ts` is now a thin `currentMonth()` over the backend `now()`. `app/src/lib/api-types.ts` keeps only the Phase 5 placeholder.
- `config.test.ts` stays in the backend because it needs the backend Nov 2026 fixtures. The `parseNotificationSettings` tests moved to `shared`.
- Tests: 149 before (61 backend, 86 app, 2 shared) and 149 after (58, 6, 85), all passing. Typecheck passes in all three workspaces, `next build` and the Metro export pass. Changing `hasHousehold` in the shared schema only makes the bootstrap contract test fail, as intended.
- Docs updated: CLAUDE.md layout and a rule for API schemas, root README (install at the root), backend README endpoint note.
- Not done yet: Vercel preview deploy and an EAS build (need a push / cloud build, so Francis decides). Nothing is committed.
- Open: the message template renderer is undecided (backend or shared); revisit in Phase 9A. Switching the backend from Next.js to Hono was discussed and left for later.

## 2026-10-24: Shared lib audit, money input helpers moved back

Francis asked whether the money input helpers belong in the shared package. They do not: only `money-input.tsx` calls `parseMoneyToCents`, `centsToInputText` and `sanitizeMoneyInput`, and the backend takes cents. They moved to `app/src/lib/money-input.ts` with their tests; `formatCents` stays in `shared/src/lib/money.ts`. CLAUDE.md now says code goes in `shared/` only when both sides need it or it defines the API contract.

Audit of the rest of what moved: the backend uses only `currentMonth` today. Kept in shared on purpose: the Singapore month and date key logic (`monthKeyOf`, `addMonths`, `dateKeyOf`, `todayKey`, `isDateKey`) and the display formatters (`formatMonthLabel`, `formatDateLabel`), because the server will need them for history, due dates and message text. Borderline, kept: `monthRange` (only the month Select uses it) and `dateKeyToValue` (only the date picker uses it); both are thin wrappers over key parsing. `isMonthKey` and `isDateKey` are not called anywhere yet; `isMonthKey` carries the existing "remove before go-live unless used" note. Tests after the move: 149 (58 backend, 38 app, 53 shared).

## 2026-10-25: 4.1 ✅

Built `GET /api/history` (past months with a saved bill, grouped by year, with a `Utilities bill $X` line and `Settled` or `N unpaid` plus `Corrected` chips) and `GET /api/history/:month` (bill card with its paid date, one row per charge titled `Label - Person`, unpaid first then newest payment first, and a banner per later correction). The API returns display-ready text so the app only renders it; the contract is in `shared/src/api/history.ts` and the date and month short formats were added to `shared` with date-fns. Backend structure is now route -> `services/history/` (database reads) -> pure builders in `lib/history/`; plan 1.5, `CLAUDE.md` and the backend README are updated for it. Added `Charge.correctsCategory` with a database CHECK constraint (migration `charge_corrects_category`, applied to dev) so a correction records what it fixes; the seed gained paid Aug and Sep bills and a paid credit correction, and dev was reseeded. Backend (80) and shared (59) tests and lint pass, and editor diagnostics are clean on the changed files (the full type check runs at the end of the phase). Both routes were checked through their services against the dev database, not over HTTP with a real session; short payments and the unpaid-bill state are not designed and not covered. Every difference from the design and the Data Model is logged in `docs/plans/design-deviations.md`. Dropped two old stashes at Francis's word.

## 2026-10-25: 4.2 🔄

Built the History UI to the API contract (backend-for-frontend: the app renders the response text and only navigates). The list (`screens/history/`) has the skeleton and year groups of month rows with chips; tapping a row opens the month detail (`screens/history-month/`, route `history/[month]`, outside the tabs) with banners, the bill card and the payment rows, plus a skeleton while loading. Added the `useHistory` and `useHistoryMonth` hooks and query keys. Decided with Francis: keep the corrected-month banner with no link and the default info icon, hide View bill until Phase 6, skeleton for the month detail, credits in the success colour via a sign check in the app, and no `__gallery` entries. All differences are logged as U1 to U10 in `design-deviations.md`. Lint passes, the hex grep finds nothing and editor diagnostics are clean on the changed files (the full type check runs at the end of the phase). Not yet checked on device.

## 2026-10-25: 4.2 🔄 (header changes)

At Francis's request `SubpageHeader` gained `subtitleIcon` (a Lucide icon before the subtitle) and `loading` (a skeleton in place of the title); the month detail uses a lock icon for "Read-only" and the title skeleton instead of the placeholder "History" title. Both are on the test page's Screen headers section. Lint passes and editor diagnostics are clean on the changed files. Still waiting for the device review.

## 2026-10-25: 4.2 ✅

Francis approved 4.2 after the header changes. The History list, the month detail (with the corrected-month banner, bill card and payments), their skeletons and the `SubpageHeader` icon and loading props stand as logged. Differences from the design are U1 to U10 in `design-deviations.md`. Lint and editor diagnostics were clean (the full type check runs at the end of the phase).

## 2026-10-25: 4.3 ✅

Skipped at Francis's request: not needed. `History.dc.html` shows no target for opening a charge, so the payment rows do nothing and no code was written.

## 2026-10-25: 4.4, Phase 4 ✅

Francis said 4.4 (check against the seeded Aug, Sep and Oct months) is essentially done, taken as approval; I did not re-run the device check. Phase 4 exit check: the full type check passes in `app`, `backend` and `shared`. Phase 4 is complete.

## 2026-10-25: Phase 5 reorganized (planning only)

Rewrote the Phase 5 section of `implementation-plan.md` as one step per Home state, each building on the last: 5.1 `upload` + `loading` (the base: contract, services, libs, route, UI), 5.2 `draft`, 5.3 `unsent`, 5.4 `collecting`, 5.5 `dueToday`, 5.6 `settled`, 5.7 start the next month early, 5.8 Home pass. Seed scenarios are now built inside each step (old 5.0 removed), with a `DEV_NOW` per step: the 1st for 5.1 to 5.3, later dates after. Home is a backend-for-frontend, `GET /api/home`, with the server choosing the month.

Decided with Francis: one row per charge with type-first titles and the due-day column; no savings special case (fronting is non-owner, non-utilities charges minus what is paid, so Tenant 2's rent counts); a fixed bill due day in the household config (`categories.utilities.billDueDay`, superseded by an uploaded bill's date); months can start early (automatically on the 1st even if last month is unsettled, or by a button once the month is settled, any day), built in 5.7 only after its design exists; every action the design shows is rendered, with actions to unbuilt screens doing nothing; each step labels its changes to earlier steps as refactor or simple addition. Dropped from Home: the aircon-due and unusual-bill alerts and the header month chevron.

Also reworded the "month summary" and old 5.3/5.4 references in 1.9, 7A.5, 7B.5 and 11.2. Logged H1 to H10 and Q1 to Q4 in `design-deviations.md`; added `billDueDay` to the Data Model doc. Dev database was reseeded once to inspect November (5 rent and recurring charges, no bill, no messages); no code changed. Decided afterwards: Sam's utilities use Priya's due day for now (per-person due dates come later). Row titles keep the design's `·` separator and the design's detail lines and badges (Francis sent the dark collecting, due-today and settled boards). Nothing is open before 5.1.

## 2026-10-25: 5.1 🔄 (Seed and Config bullets done)

Marked Phase 5 and 5.1 in progress. Config: added the optional `categories.utilities.billDueDay` to the shared household schema, set it in the fixtures (Nov 16, Aug to Oct 25) and added a test; the Data Model doc already had the line. Seed: `--scenario` is read with `parseArgs` (default `upload`, unknown names exit before touching the database) and the script prints the `DEV_NOW` to use; November is no longer seeded, so Home opens it. Config and split tests pass and editor diagnostics are clean on the changed files (the full type check runs at the end of the phase); the seed was not run against the dev database. Stopped before the Shared bullet at Francis's request to review the proposed code first. Decided: Nudge appears only on overdue rows, so none at 1 Nov (Jordan's rent is due today). Still open: the `dayMonth` field and whether the enums start with one value.

## 2026-10-25: 5.1 🔄 (Shared bullet done)

Added `shared/src/api/home.ts` (the `GET /api/home` contract, with only the 5.1 enum values and one hero body, `waiting`), a `daysUntil` helper in `shared/src/lib/date.ts` with tests, and a `dateKey` primitive. Decided with Francis: rows carry the raw `dueDate` key and the app formats the day and the short month, so there is no `dayMonth` field. Shared tests pass (63) and the shared type check and editor diagnostics are clean. Backend and App bullets are still to do.

## 2026-10-25: 5.1 🔄 (Backend bullet done)

Added the pure builders `lib/home/derive-month-status.ts` and `lib/home/build-home.ts`, the service `services/home/home.service.ts` (opens the calendar month, then reads the newest opened month; 409 `no_household` when none), the thin `GET /api/home` route and its README row, and exported `dueDateFor` from the engine. The shared row `detail` became nullable: a detail line shows only for a charge paid via someone else, and paying direct shows nothing (H11); the date format decision is H12. Tests pass (14 new: status, builder on the Nov 2026 fixtures at 1 Nov including the $3,602.50 fronting figure, and a service contract test that parses with the shared schema); lint and editor diagnostics are clean on the changed files (the full type check runs at the end of the phase). The route was not called over HTTP and the seed was not run against the dev database. App bullet still to do.

## 2026-10-25: 5.1 🔄 (App bullet done, waiting on device review)

Added `useHome` and the `home` query key, and removed the step 1.9 placeholder (`use-month-summary.ts`, `monthSummary`, `lib/api-types.ts`) and the spike `dev-bootstrap-check.tsx`. Rebuilt `screens/home/` to the History layout (main file, `types.ts`, barrel, one component per file): hero card with the steps bar and two tiles, the pinned compact summary after 140px of scroll, the Charges accordion (rows open by default when the server says so, tinted when due today), the loading skeleton, the footer button and a danger Alert on error. The route `(tabs)/index.tsx` is a thin wrapper. Row buttons and links go through one `openTarget`, which does nothing until Phases 6 and 7. Small changes elsewhere: `AccordionRow` gained `className`, and the top shadow now comes from `lib/elevation.ts`, shared by the bottom nav and the footer. Checks: editor diagnostics clean on the new and changed files, `npm run lint` clean, app tests pass (40, including the new due-date test), the hex grep finds nothing, and a cleared Android export compiles every new class to its expected value (checked in the bundle). Not run: the full type check (phase end), the dev database seed, `GET /api/home` over HTTP with a session, and the screen on a device. Deviations H13 and H14 logged.

## 2026-10-25: 5.1 🔄 (follow-ups from review)

Per Francis: the hero tiles and unreached step bars now use the existing `background` token instead of an approximated class, so `screens/home/styles.ts` is gone (H13 updated); `formatDueDate` moved into `screens/home/helpers.ts` and its test was dropped, since `formatDateShort` is already tested in shared; two comments in `shared/src/api/home.ts` use role names instead of the sample names. Still waiting on the device review.

## 2026-10-25: 5.1 🔄 (Card bug found on device)

Francis's device review showed tinted rows on Home and History stopping short of the card edges. Cause: `Card` with `padded={false}` never removed the default padding. `ui/card` set `none: ''`, and tailwind-variants treats an empty variant as unset and falls back to `default` (`p-4 gap-3`), so every unpadded card carried 16px padding and a 12px gap. Fixed in `ui/card/styles.tsx` (`none: 'p-0 gap-0'`). This also changes the other unpadded cards: History list and month detail, the test page, and the Returning checklist, which loses the stray 12px gap between its rows. Verified only by reproducing the class output with tailwind-variants; not yet re-checked on device. Other empty variants exist in `ui/alert-dialog` and `ui/textarea`, which fall back to their defaults and are not changed.

## 2026-10-25: 5.1 ✅

Francis reviewed 5.1 on device and approved it. After the review: the Card padding fix was confirmed (tinted rows now fill the card), the hero tiles use the `background` token, and the light-mode tint of the due-today row was left as the design has it (Francis called it a design issue; a trial with `info-container` was reverted). Pixel checks of the dark-mode screenshots matched the tokens. The full type check has not been run; it runs at the end of the phase, and everything so far was checked with editor diagnostics, lint and tests. Next is 5.2 `draft`.

## 2026-10-26: 5.2 🔄 (built, waiting on device review)

Added the `draft` status end to end. Shared: `draft` in the status enum, a `notice` on the row schema, `primary` tone and a nullable icon on actions, two draft targets and a `formatMonthName` helper with tests. Backend: `deriveMonthStatus` takes `hasDraft`; the service looks the draft up by id only (no bytes); `buildHome` puts the "Unfinished bill draft" notice with Continue and Discard draft on the bill row and otherwise treats `draft` like `bill_missing`; the seed has a `draft` scenario (synthetic parsed fields, placeholder PDF). App: `Accordion` rows gain a `before` slot, a new `HomeRowNotice` draws the info Alert with its two buttons, and `openTarget` ignores the new targets until Phase 6B. Deviation H15 logged. Checks: shared (70), backend home tests (19) and app tests (38) pass, lint is clean apart from a warning in the generated `.expo` types, editor diagnostics are clean on the changed files (the full type check runs at the end of the phase) and the hex grep finds nothing. Not run: the dev database seed, `GET /api/home` over HTTP, and the screen on a device.

## 2026-10-26: 5.2 🔄 (notice moved to the hero)

Francis's device review showed the draft notice below the fold, above the 16 Nov bill row. Per Francis it now sits at the bottom of the hero card, like the due-today Alert planned for 5.5. The hero schema carries a nullable `notice` and the row schema no longer has one; `buildHome` fills it only for `draft`; the app draws it with a new `HomeNotice` in `HomeHero`, and the bill row is plain again. The `Accordion` `before` slot stays, unused, at Francis's request. Deviation H15 rewritten. The plan text for 5.2 still says "the bill row gains a notice" and "row schema gains `notice`"; it was not edited. Shared (70), backend home (19) and app (38) tests pass, lint is clean apart from the existing `.expo` warning, editor diagnostics are clean on the changed files, and the hex grep finds nothing. Not run: the seed, `GET /api/home` over HTTP, and the new layout on a device (including how the Alert and buttons look inside the hero in light mode).

## 2026-10-26: 5.2 🔄 (footer reworded for the draft)

Per Francis, the draft's footer button is "Continue bill upload" and opens the draft (`bill-draft-continue`), instead of repeating "Upload utilities bill" beside the hero's Continue and Discard draft. It stays visible when the hero scrolls away, so the compact summary does not need the notice. Only `buildPrimaryAction` changed (draft case split from `bill_missing`), plus a builder test; the plan line "the footer button stays" was not edited. Deviation H15 updated. Backend home tests pass and lint is clean on `lib/home`; editor diagnostics were not re-run on `build-home.ts` after this small edit beyond the test run. Not run on a device.

## 2026-10-26: 5.2 🔄 (footer icon)

The draft footer button now uses an arrow-right icon instead of the upload one. The footer icon in the contract is `upload` or `arrow-right`; the backend sends `arrow-right` for the draft and `HomeFooter` maps the name to the Lucide icon (it was hard-coded to Upload). Shared (70) and backend home (20) tests pass and app lint is clean apart from the existing `.expo` warning. Not run on a device.

## 2026-10-26: 5.2 🔄 (footer icon changed to file-pen)

Per Francis, the draft footer icon is `file-pen` instead of `arrow-right`. The footer icon in the contract is now `upload` or `file-pen`; the backend sends `file-pen` for the draft and `HomeFooter` maps it to the Lucide `FilePen`. Deviation H15 updated. Not run on a device.

## 2026-10-26: 5.2 ✅

Francis reviewed 5.2 on device and approved it. Final shape: the draft status and seed scenario, an info Alert in the hero (title, text, Continue and Discard draft) and a footer that reads "Continue bill upload" with a file-pen icon. Deviations H15 and H16 and plan deviation Q5 are logged in `design-deviations.md`; the plan text for 5.2 was not edited. Open for Phase 6A: Continue needs a `GET /api/months/:month/bill-draft` that the plan does not list. The full type check has not been run; it runs at the end of the phase. Next is 5.3 `unsent`.

## 2026-10-26: 5.3 🚫

Backend first, at Francis's request; no code written yet. Read the plan, `Main.dc.html` (`unsent`), the Home builders and service, the seed and the Nov 2026 fixture. Blocked on two points the plan leaves open. (1) Who counts as a payer who needs a MONTHLY message: the design says "2 messages are ready" (Jordan, and Priya with Sam's utilities), but Sam also pays his rent directly, so "any payer who owes something" would give 3. (2) Which one-row-per-charge rows get the "Not sent" badge and "Review message" link, since the design groups Priya's charges into one row and keeps Jordan's rent on its own chip. Question asked, with a recommendation: messages go to payers with at least one utilities charge, and only utilities rows show "Not sent".


## 2026-10-26: 5.3 🔄 (backend built, waiting on review before the app)

Resolved the two open points with Francis: a person needs a monthly message only if they pay a utilities charge, so Sam rides in Priya's message and the count is 2, and only the utilities rows show "Not sent" (one row per charge stays). Built the backend only: shared contract (`unsent` status and hero body, `bill-view` target), `message-recipients.ts`, status derivation from message events, the builder (Not sent rows, real bill row, step 2 hero, no footer), the service (reads the bill amount and due date and the MONTHLY events) and the `unsent` seed scenario. A new test caught that Sam's real utilities charge has no stored due date, so the row now uses Priya's due day, as the projected row did in 5.1. Backend tests pass (122), shared tests pass (70), editor diagnostics and ESLint are clean on the changed files (the full type check runs at the end of the phase). Deviations H17 to H19 and Q6 are logged and the README row is updated. Not run: the dev database seed, `GET /api/home` over HTTP, and the app, which still needs an `unsent` hero branch and a `bill-view` case.

## 2026-10-26: 5.3 🔄 (app built, waiting on device review)

Francis seeded the `unsent` scenario himself; calling the real service against the dev database returned a response that parses with the shared schema (status `unsent`, three Not sent utilities rows, bill row $412.30 in 15 days, no footer). App: `HomeHero` now renders the `unsent` body with the same title, text and tiles as `waiting`, and `openTarget` ignores `bill-view` until Phase 6C. Nothing else changed: the footer is already skipped when the server sends no primary action, and the `primary` badge tone and open rows were already supported. App tests (38) pass, ESLint is clean on `screens/home`, editor diagnostics are clean on both files and the hex grep finds nothing. Not run: the screen on a device, in light and dark.

## 2026-10-26: 5.3 🔄 (Sam's Review message removed)

Per Francis, after the first device look: Sam's utilities row no longer offers `Review message`, since Sam gets no message. A charge paid via someone now stays closed with the usual `View details` link to Priya's page, and keeps `Pays via Priya` and the `Not sent` badge until Priya's message goes out. Jordan's and Priya's own utilities rows still start open with `Review message`. Backend only (`chargeRow`); the app needed no change because the label, open state and target all come from the data. Backend tests pass (123), ESLint and editor diagnostics are clean on the changed files. Deviation H17 updated. The dev database needs no reseed. Not run on a device again.

## 2026-10-26: 5.3 ✅

Francis reviewed 5.3 on device and approved it. Final shape: the `unsent` status and seed scenario, the "Bill's in. Send the breakdowns" hero at step 2 counting two messages (Jordan and Priya), `Not sent` utilities rows (Jordan's and Priya's open with `Review message`; Sam's closed with `View details` to Priya's page), the bill row with the saved amount, due date and note, and no footer. Deviations H17 to H19 and Q6 are logged; the plan text for 5.3 was not edited. Open: Sam's row keeps the `Not sent` badge (Francis did not ask to remove it); `bill-view` and the Review message links do nothing until Phases 6C and 7B. The full type check has not been run; it runs at the end of the phase. Committed on `phase-5-homepage`, without `docs/plans/`. Next is 5.4 `collecting`.

## 2026-10-26: 5.4 🔄 (backend built, stopped before the app)

Backend only, at Francis's request. Francis chose N ≤ 3 for "Due in N days". Shared contract: `collecting` status, a collecting hero body (fronting with "back so far", bill coverage with a percent), a `warning` tint and action tone, `bell` and `banknote` icons, and `record-payment` and `mark-bill-paid` targets. Backend: full chip precedence in `badges.ts` (overdue, due today, due tomorrow, due in N days, sent unpaid, upcoming), `Nudged`, `Sent` and `Paid` detail lines, Nudge or Nudge again beside Mark paid on overdue rows, the bill row open with "$X of $Y covered so far" and Mark bill paid, the `Record payment` footer, and `deriveMonthStatus` returning `collecting` once every message is out. The service now reads paid dates and all message events; the `collecting` seed scenario is added. Deviations H20 to H22 and Q7 are logged. Backend tests (137), shared tests (70), backend type check and ESLint on the changed files pass. The app type check shows two expected errors (icon maps in `home-action-button` and `home-footer`); the app is not touched yet. Not run: the seed, `GET /api/home` over HTTP, and the app. The plan text for 5.4 was not edited.

## 2026-10-26: 5.4 🔄 (app built, waiting on device review)

App side of 5.4. The hero draws the collecting body in a new `HomeCollectingBody` (fronting figure with the "back so far" note, then the bill coverage line, `Progress` bar and note). Overdue rows take the warning tint, Nudge uses the existing `warning` button with a bell icon, and the footer maps the `banknote` icon. `openTarget` ignores `record-payment` and `mark-bill-paid` until Phases 7A and 6C. Deviation H23 logged (hero label colours). Editor diagnostics on the changed files, ESLint on `screens/home`, the app tests (38) and the full app type check are clean, and the hex grep finds nothing. Not run: the seed, and the screen on a device in light and dark.

## 2026-10-26: 5.4 ✅

Francis reviewed 5.4 on device and approved it. The 34px fronting figure first looked too small; it was a stale Metro cache for the new `text-hero` class, and restarting with `-c` fixed it with no code change. Final shape: the `collecting` status and seed scenario, the fronting and bill-coverage hero, the full chip precedence (Due in N days up to 3 days), `Nudged`, `Sent` and `Paid` detail lines, Nudge or Nudge again beside Mark paid on overdue rows, the open bill row with Mark bill paid, and the Record payment footer. Deviations H20 to H23 and Q7 are logged; the plan text for 5.4 was not edited. Open: Nudge opens the payer's Recipient page until Phase 7B, and the full type check across all packages runs at the end of the phase. Not committed. Next is 5.5 `dueToday`.

## 2026-10-26: 5.5 🔄 (built end to end, waiting on device review)

Committed 5.4 first (`d5e1403`, without `docs/plans/`). 5.5 backend and app together, at Francis's request. Shared: the hero gains a nullable `dueToday` (text and amount). Backend: `dueTodayCopy` builds the one-line text and total for unpaid non-owner charges due today while collecting ("Jordan’s utilities are due today", or a count for several), the compact status says the same, and a due-today row gets the "payment check tonight" note; `dueToday` seed scenario (the collecting seed with Jordan's rent paid; `DEV_NOW=2026-11-04T09:00:00+08:00`). App: `HomeDueToday` draws the Alert with a Clock icon and the amount at the right, using a new optional `trailing` on the `Alert` wrapper; the hero shows it above any notice. Deviations H24 and Q8 are logged; `dueToday` is not a status. Backend (144), shared (70) and app (38) tests, the backend and app type checks, ESLint on the changed files and the hex grep are all clean. Not run: the seed, and the screen on a device in light and dark.

## 2026-10-26: 5.5 ✅

Francis reviewed 5.5 on device and approved it. Final shape: the hero's one-line due-today Alert (Clock icon, amount at the right), the compact status and the "payment check tonight" row note while collecting, the `dueToday` seed scenario, and the `trailing` prop on the `Alert` wrapper. Deviations H24 and Q8 are logged; the plan text for 5.5 was not edited. Not committed. Next is 5.6 `settled`.

## 2026-10-26: 5.6 🔄 (built end to end, waiting on device review)

Backend and app together, at Francis's request. Shared: `settled` status and a `settled` hero body (title, text, two tiles, footnote). Backend: `isMonthSettled` (saved bill paid and every non-owner charge has a payment), `deriveMonthStatus` returns `settled` ahead of `unsent` and `collecting`, the service now reads the bill's paid fields, and `buildHome` builds the settled hero (all steps done, "29 Nov · Done", no footer, footnote without the savings sentence) and a Paid bill row ("You paid 16 Nov", closed, no Mark bill paid); the `settled` seed scenario (`DEV_NOW=2026-11-29T09:00:00+08:00`) is added. App: new `HomeSettledBody` (check circle, title, text, tiles, footnote) used by `HomeHero`. Deviation H25 logged; the plan text for 5.6 was not edited. Backend (159), shared (70) and app (38) tests, ESLint on the changed files, editor diagnostics on every changed file and the hex grep are clean (type check was diagnostics only). Not run: the seed, `GET /api/home` over HTTP, and the screen on a device in light and dark.

## 2026-10-26: 5.6 🔄 (check marks removed from the hero steps)

Per Francis, the hero's step bar no longer shows a check mark on done steps, matching the compact bar. Only `home-steps.tsx` changed (the `Check` icon and its import are gone; `compact` now only tightens spacing). Deviation H26 logged. ESLint on `screens/home` and editor diagnostics on the file are clean. Not run on a device again.

## 2026-10-26: 5.6 ✅

Francis reviewed 5.6 on device and approved it. Final shape: the `settled` status and seed scenario, the settled hero (check circle, "November is settled", fronting and bill-covered tiles, footnote without the savings sentence, all steps done, "29 Nov · Done"), Paid rows with "Paid d Mmm", the Paid bill row ("You paid 16 Nov", no Mark bill paid), no footer, and no check marks on done steps in the hero step bar. Deviations H25 and H26 are logged; the plan text for 5.6 was not edited. The full type check across all packages runs at the end of the phase. Not committed. Next is 5.7 (start the next month early), which cannot start until its design is agreed and added to `docs/design/`.

## 2026-10-26: 5.7 🔄 (built end to end, waiting on device review)

Backend and app together, at Francis's request. Francis chose the existing `settled` scenario over a new `settled-oct` one, and the plan text for 5.7 was updated to say so. Shared: `nextMonthAction` on the Home response (fixed label and the Close dialog text) and `startNextMonthResponseSchema`. Backend: `buildNextMonthAction` in `build-home.ts` (settled only), `startNextMonth` (409 `not_settled`, `month_already_open`, `no_household`), `POST /api/home/start-next-month`, and `getActiveMonth`, which History's list and month detail and bootstrap now use (`getBootstrap` moved to `services/bootstrap/`). App: `useStartNextMonth`, a `loading` state on `ConfirmDialog`, the settled bottom bar with Start next month and the Close dialog, `HomeFooterBar` shared by both footers, and the bottom navigation dropping its shadow while a footer shows. Deviations H27, H28, Q9 and Q10 are logged. Backend (167), shared (70) and app (38) tests, the backend and app type checks, ESLint on the changed files, editor diagnostics on the changed app files and the hex grep are clean. Not run: the seed, the endpoint over HTTP, and the screen on a device in light and dark.

## 2026-10-26: 5.7 🔄 (failed close stays in the dialog)

Per Francis, a failed close now keeps the Close dialog open with the error Alert inside it (new optional `error` on `ConfirmDialog`), so Confirm can be retried; a network failure still closes the dialog so it is not under the "Can't reach the server" prompt. Deviation H27 updated. A temporary mock failure is in `start-next-month.service.ts` for the device check and must be removed before 5.7 is marked done. ESLint and editor diagnostics on the changed files are clean. Not run again on a device.

## 2026-10-26: 5.7 🔄 (mock error removed, settled footnote dropped)

The mock failure is out of `start-next-month.service.ts`; Francis verified the failed close and the network failure. At Francis's request the settled hero's footnote ("December’s bill usually lands around the 2nd.") is removed from the shared schema, `buildHome`, the app component and the tests, and the year-rollover test now checks the Close dialog (December to January). Deviation H25 updated. Backend (167) and shared (70) tests, both type checks and ESLint on `screens/home` are clean. Not run again on a device.

## 2026-10-26: 5.7 🔄 (side trip: pull down to refresh)

Francis verified 5.7 on device and approved moving on, with a side trip first: pull-down refresh on Home and History (not in the plan). New `usePullToRefresh` hook (own `refreshing` flag, so background refetches do not show the spinner) and `AppRefreshControl` (circle coloured by the `card` token class, no hex), used by both `ScrollView`s. App type check and ESLint on the changed files are clean. Not run on a device: how the spinner reads in light and dark, and that a pull refetches.

## 2026-10-26: 5.7 🔄 (pull to refresh fixed: blank Home and History)

The first pull-to-refresh version blanked Home and History on device. Cause: on Android `ScrollView` clones its `refreshControl` and gives it the layout `style`; my styled `AppRefreshControl` wrapper dropped that `style`, so the list collapsed. The wrapper is deleted and both screens use React Native's `RefreshControl` directly (platform spinner colours, no token colouring). App type check and ESLint on the changed files are clean. Not run on a device again.

## 2026-10-26: 5.7 ✅

Francis reviewed 5.7 on device and approved it. Final shape: `POST /api/home/start-next-month` and `nextMonthAction` on Home (settled only), `getActiveMonth` used by History and bootstrap, the Start next month bar and Close dialog (a failed close stays in the dialog with the error inside it, a network failure closes it), the bottom navigation dropping its shadow under any footer, the settled hero without its footnote, and pull-down refresh on Home and History. The temporary mock error is removed. Deviations H27, H28, Q9 and Q10 are logged, and H25 and H2 updated; the plan text for 5.7 was edited only to use the 5.6 `settled` scenario. Open: the Household edit rule (Phase 8) must read `getActiveMonth`, and the full type check across all packages runs at the end of the phase. Not committed. Next is 5.8 (Home pass).

## 2026-10-26: 5.8 ✅

Home pass, at Francis's request without a device walk (each scenario was already verified per seed). Full type check, tests and lint pass in all three packages: shared 70 tests, backend 167, app 38; shared has no lint script; the two lint warnings left are in generated or existing files (`prisma.ts`, `.expo/types`). The hex grep finds nothing in Home code, and every Home touch target is 44px or more (buttons h-12 and h-11, links min-h-11). `deriveMonthStatus` already has a test per status (all five). Dead code: removed the unused `before` slot on `Accordion` (H15 updated); the projected utilities rows are still live for `bill_missing` and `draft`, and `add-charge-sheet.tsx` stays for Phase 11. Deviation Q11 (pull-down refresh) added, so the list covers H1 to H28 and Q1 to Q11. Phase 5 is complete. Not committed.

## 2026-10-28: Phase 6 reorganized (planning only)

Rewrote the Phase 6 section of `implementation-plan.md` as nine steps, the way Phases 4 and 5 were: 6.1 Parser (backend only), 6.2 Upload base (`pick`, `reading`, `review`, save), 6.3 Checks (`period`, `sum`, `partial`, `noLines`, `unusual`, `confirm`, `addLine`), 6.4 `discard` and the Home draft, 6.5 Unreadable bill (`readingFail`, `failed`, `unread`), 6.6 View bill (`loading`, `collecting`, `paid`, plus an assumed `unsent`), 6.7 Open the PDF, 6.8 Mark bill paid sheet, 6.9 Phase pass. The old IDs map in the build-order notes, and Phase 11's pointer to 6B.6 was reworded. No code changed.

Decided with Francis: upload comes first (parser, then upload, then View bill reviewed on seed data and on the uploaded bill, then Open PDF, then Mark bill paid last; Francis reversed his first answer, "read-only first", after asking why Mark bill paid came before upload). A billing period that does not match the month blocks Save, as the design shows (the old plan said warning). A bill with no file (`MANUAL`) is deferred because no board has an entry point. Replace bill stays out of v1. The device checks required fields only and the server does every other check, with display-ready text and a second check at save; Francis ruled out a shared helper for the rest, since checks like "month already has a bill" and the per-share text need database and engine data. The `noLines` box is shown by the app whenever there are no lines. The unusual-bill check stays in upload as a third warning in the "Save with warnings?" dialog (not moved to 9B); the docs define neither "unusual" nor "recent", so the threshold (proposed: more than 25% above or below the average of the last 3 saved bills) and the wording are agreed at 6.3, and the 9B notification reuses the rule. The Bill month is read from the PDF and can be changed; Save is blocked when it or the period does not match the month the upload started from.

Defaults taken and accepted: `MAX_BILL_PDF_BYTES` is 4 MB, not 5 MB, because the current Vercel docs cap a request or response body at 4.5 MB on every plan (checked 2026-10-28); a draft row is stored for every upload, including an unreadable one; no weekday in dates; Mark bill paid has no note field and its alert is about what has been collected; Add line is an inline row; `readingFail` is not a state of its own; the reading board uses a Spinner, not the 62% bar; the number pad on `unread` is not built; View bill `unsent` uses the collecting layout with "Waiting" and no Mark bill paid button; the three native modules (`expo-document-picker`, `expo-file-system`, `expo-intent-launcher`) are installed together in 6.2 so one EAS build covers 6.2 and 6.7. Found while reading: the seed's placeholder PDF is not a valid PDF, so 6.7 uses the synthetic PDF from 6.1.

Still to decide at build: the message for a picked file that is not a PDF or is too large (6.2); which billing period counts as matching a month and how the bill month is read from the PDF (6.3); the unusual-bill threshold and wording (6.3); how a Home action opens a sheet (6.8, reused by 7A). Logged B1 to B15 in `design-deviations.md`.

## 2026-10-29: 6.1 ✅

Built the bill parser: `lib/bill/bill-parser.ts` (provider-neutral `BillParser`/`ParsedBill`, `parseBillText()`), `lib/bill/util-bill-parser.ts` (`utilBillParser`, renamed from the plan's `SpGroupParser` — Francis confirmed "PUB" is just the local nickname for the same provider, SP Group), and `services/bill/read-bill.service.ts` wiring `unpdf` to it. `Bill.provider` was dropped entirely (schema migration applied to the dev DB; nothing read or displayed it) after Francis asked to check every `ParsedBill` field for actual use; `billMonth` stayed after Francis caught it was still needed for the Review bill screen's default, even though it's not a stored `Bill` column. Francis redirected two pieces of reuse: `parseDisplayDate` (date-fns `parse`/`isValid`, no hand-rolled month map) and `parseDisplayMonth` went into `shared/src/lib/date.ts`/`month.ts`; `parseMoneyToCents` moved from the app-only `money-input.ts` into `shared/src/lib/money.ts` since the backend now needs it too; the utility line labels (`Electricity`, `Gas`, `Water`, narrowed from a longer list) became `UTIL_BILL_LINE_LABELS` in `shared/src/lib/bill.ts`. The synthetic fixture PDF is generated on demand (`npm run generate:bill-fixture`) and gitignored, not committed — the unit test generates it in memory.

Verified against the real bill in several rounds, using a throwaway uncommitted script (`check-real-bill.ts`, never committed, deleted after use) that only ever printed masked/structural output back to this conversation — except one `--diagnose` full-text dump Francis authorized running directly, which leaked his real name and address into the transcript (caught immediately, not repeated, flagged to Francis for his own follow-up). The real bill's layout is a multi-line table, not `label: value` pairs, which took three fix rounds: Current Charges needed its own "due on `<date>` (`<day>`) `$<amount>`" sentence match; Billing Period's dates sit on the line after the header, not next to the label; the Electricity/Gas/Water amounts sit several lines below each "`<Type>` Services" header; "Payment Due:" has no "Date" word; the bill month comes from a standalone "`<Month>` `<Year>` Bill" heading. Francis confirmed (`--unmask`, his own terminal only) that all fields now read correctly.

Backend 180 tests, shared 93 tests, typecheck and lint clean in both. Also fixed in passing: an earlier `npm install` had dropped `@tanstack/react-query`, `react-hook-form` and `@hookform/resolvers` from the app's `node_modules` (restored) and left a stray `date-fns` entry in `backend/package.json` (removed, backend only uses it via `@splithouse/shared`).

## 2026-10-29: 6.2 🔄

Built the upload base. Shared: `api/bill-draft.ts` (draft response, save request and response), `MAX_BILL_PDF_BYTES` (4 MB) and `formatBillFileMeta`, `formatDateMedium` and `formatDateRange`. Backend: `POST`/`GET /api/months/:month/bill-draft` (PDF signature, size, one draft per month, lazy purge, unreadable PDFs stored with `readOk: false`) and `POST /api/months/:month/bill` (one transaction: Bill, BillFile through the new `BillFileStore`, utilities charges from the split engine, draft deleted; 404 `no_draft`, 409 `bill_exists`/`month_not_open`); `readBill` now also returns the page count; the seed's `draft` scenario uses the synthetic PDF and the parser's shape. App: `expo-document-picker`, `expo-file-system` and `expo-intent-launcher` installed (needs a new EAS development build), route `bill/[month]/upload`, `screens/bill-upload/` (`pick`, `reading` with a Spinner, `review` with editable fields and lines, Save), a `DateRangeField`, `showWeekday` on `DateField`, and Home's `bill-upload` target wired. Logged B16 to B21 and updated B12 (placeholder copy for a turned-away file until Francis's design).

Shared 100 tests, backend 207, app 25; backend type check, ESLint on every changed file and the hex grep are clean. The app type check is clean except Expo Router's stale generated route types (they also reject the existing `/history` route; Metro regenerates them). Not run on a device: waiting for the EAS build and Francis's review with the `upload` scenario.

## 2026-10-29: 6.2 🔄 (buttons use the Button wrapper)

At Francis's request, Add line on Review bill is now a ghost small `Button`, and the line's remove ✕ uses a new `iconOnly` option on `Button` (a 44px or 48px circle that draws only the icon and keeps `label` for screen readers), replacing two hand-built Pressables. ESLint and the app type check on the changed files are clean. Not run on a device.

## 2026-10-29: 6.2 🔄 (weekday opt-in)

At Francis's request, `DateField`'s `showWeekday` is now opt-in (default `16 Nov 2026`, per B2), so Review bill no longer passes it and the dev gallery's date fields drop the weekday too. ESLint and the type check on the changed files are clean. Waiting for Francis to say whether 6.2 can be marked done.

## 2026-10-29: 6.2 ✅

Francis reviewed 6.2 on device and closed it. Changes since the last entry, found on device:
- **Upload never left the phone.** The global `fetch` is `expo/fetch`, which rejects React Native's `{ uri, name, type }` form part, and `apiFetch` turned that local error into "Can't reach the server". The part is now a plain object with `name`, `type` and `bytes()` read from the picker's cached copy. The picker's cached copy has a UUID name, so the original name is sent in the part; `expo/fetch` percent-encodes it, so the route decodes it (`decodeFilename`).
- **No reading board.** Review bill opens as soon as the file is picked, with the file's name and a skeleton of the form (`ReviewSkeleton`); Cancel stays in the footer. `ReadingStep` is deleted (B8, B25).
- **Bill month** is a free-text field in `Mmm YYYY` (`Oct 2026`) until a month picker exists, with a check that blocks Save on text that is not a month. New shared `formatMonthShortLabel` and `parseShortDisplayMonth`; `billMonthOptions` removed (B17).
- **Current Charges** empty now gives the required error and a red box as the field is cleared (the form checks as you type), and the footer hint uses the danger colour (B26).
- **Text cuts** (the pick intro, the Total Amount Payable note, the Current Charges helper, the Due date placeholder) logged as B22 to B24, B18.
- **Seed:** new `uploadOct` scenario (Aug and Sep only, `DEV_NOW=2026-10-01T09:00:00+08:00`) for testing with an October bill; the October block moved into `seedOctober`.

Left for later steps, by design: the period and bill-month checks (a September bill saves into October until 6.3), Add line (6.3), the discard dialog and Review-step Cancel (6.4), Home's View bill link (6.6). Removed two debug `console.log`s from `bill-upload.tsx`. Shared month tests 48, app bill-upload tests 7.

## 2026-10-29: 6.3 🔄 (check 1 of 8: required fields)

Settled the 6.3 rules with Francis before building. The per-share helper under Current Charges is dropped (not built, not returned). His real billing period runs from the 3rd to the 2nd of the next month, so the period is never compared to a calendar month: Bill month and Billing period become required, and the only blocker against the month is the Bill month not matching the month the upload started from (the field stays editable, so a misread can be corrected). Threshold and wording for the unusual-bill warning: the proposals (25% of the last 3 saved bills). Plan text, B14, B15, B17 and B18 updated. Francis asked for the checks one at a time, each reviewed before the next: 1 required fields, 2 bill month mismatch (with the check endpoint), 3 `sum`, 4 `partial`, 5 `noLines`, 6 `addLine`, 7 `unusual`, 8 `confirm` dialog.

Check 1 built: the save schema now requires `billMonth`, `billingPeriodStart` and `billingPeriodEnd`; the form shows both fields as required with "Enter the bill month" and "Enter the billing period"; the footer hint names the first empty required field and Save stays disabled. A start after the end needs no check, since the date range field cannot pick an end before the start. Shared/backend route tests (4 new 400 cases) and 13 app tests pass; ESLint and editor diagnostics clean on the changed files (the full type check runs at the end of the phase). Not run on a device: waiting for Francis's review with the `uploadOct` or `upload` scenario.

## 2026-10-29: 6.3 🔄 (check 1 adjusted)

At Francis's request the footer hint under Save is gone: each field shows its own error, and Save is disabled by `formState.isValid` from the form's own checks (so a bill month typo or a nameless line also disables it, with the error on that field). `hasMissingRequired` was removed. `DateRangeField` gained a `clearable` × button (on by default, like `DateField`); named `clearable` to match the other fields. App bill-upload tests 11 pass; ESLint and editor diagnostics clean on the changed files. Not run on a device.

## 2026-10-29: 6.3 🔄 (check 2 of 8: bill month)

Check 1 was committed as 8abafaf. Check 2 built: the bill month on the form must be the month the upload started from. Shared: `checkBillRequestSchema` (the form's values, any of them null), `checkBillResponseSchema` and `billBlockerSchema` (field, Alert title and text, short field error). Backend: pure `lib/bill/check-bill.ts` (table-tested, also guards Save), `services/bill/check-bill.service.ts`, `POST /api/months/:month/bill-draft/check`, and `saveBill` now returns 422 `bill_blocked` with the Alert text; the real response is parsed with the shared schema in the route test. App: `useDebouncedValue`, `useCheckBill` (query, keeps the previous answer while typing, 500 ms after typing pauses), `toCheckBillRequest`; the Alert shows above the form, Bill month turns red with "Should be November 2026" and Save is disabled while there is a blocker. The billing period is never matched to the month (B15, B28); the footer hint is gone (B27). README rows updated.

Shared 110, backend 51 (bill lib, services and routes), app bill-upload 14 tests pass; ESLint clean on the changed files and editor diagnostics clean (the full type check runs at the end of the phase). Not run on a device: waiting for Francis's review with `upload` (bill read for November) and `uploadOct` (a November bill uploaded into October shows the Alert).

## 2026-10-29: 6.3 🔄 (check 2 extended: billing period)

Francis asked for a billing period check too, to catch a wrong pick such as next year. Rules, as he set them: the billing period must start in the Bill month, and its total days must be at most 30. The days are counted between the first and last day, so his usual 3rd to 2nd period (30 days apart in a 31-day month) passes in every month; an end before the start is also a blocker. Same pattern as the Bill month check: pure `checkBillingPeriod` in `lib/bill/check-bill.ts` (table-tested, including February, 30 vs 31 days and a start in the wrong year), a red Billing period field with a short error, a danger Alert "Check the billing period", Save disabled, and 422 `bill_blocked` at Save. It uses the Bill month on the form, not the upload month, and stays quiet while a month or date is missing. I first built a looser rule (start in the bill month or the month before) on a guess about his bill, which Francis stopped; he then gave the rule above. The synthetic fixture bill's invented period moved from 1 to 31 Oct to 3 Nov to 2 Dec so it still passes (regenerate the PDF with `npm run generate:bill-fixture` in `backend/` before copying it to the phone). B15, B28, the README row and the plan text updated.

Backend 227 tests (all), shared 110, app bill-upload 14 pass; ESLint clean on the changed files (one existing warning in `prisma.ts`); editor diagnostics clean. Not run on a device.

## 2026-10-29: 6.3 🔄 (billing period rule corrected)

Francis corrected the billing period rule: a bill pays for the month before it (the October bill covers 3 Sep to 2 Oct, the November bill 3 Oct to 2 Nov). The check now requires the period to start in the month before the Bill month, not in the Bill month; the at-most-30-days-between rule and the end-before-start block are unchanged. The earlier "start in the Bill month" wording came from a misread of his first answer. The checks are now a list of `BlockerCheck` functions (`BLOCKER_CHECKS` in `lib/bill/check-bill.ts`) so later checks are added by writing one function and listing it. The synthetic fixture bill's invented period went back to 3 Oct to 2 Nov (its bill date of 1 Nov fits again); regenerate the PDF with `npm run generate:bill-fixture` in `backend/` before copying it to the phone. Plan text, README and B28 updated. Backend 227 tests pass; ESLint clean on the changed files; editor diagnostics clean. Not run on a device.

## 2026-10-29: 6.3 🔄 (field error wording)

Francis did not like field errors that say what the value should be ("Should be November 2026"). The red fields now say only "Invalid bill month" and "Invalid billing period" (the latter for every billing period rule); the Alert above the form still explains why. B28 updated. Backend bill tests (60) pass; ESLint and editor diagnostics clean. Not run on a device.

## 2026-10-29: 6.3 🔄 (errors independent, Alerts inside the card)

Found on device: the Alerts sat at the top of the page (the design puts them in the card under the Billing period field), and editing the Bill month hid the billing period error, because the period was judged against the typed Bill month. Both Alerts now sit together inside the card, and the billing period is judged against the month the upload started from, so each error shows on its own whatever the other field says. A test covers Bill month Dec 2026 with a 19 Nov period in a November upload (both flagged). Plan text, README and B28 updated. Backend 228 tests pass; ESLint and editor diagnostics clean. Also noted for Francis: his test PDF read as bill month November with a period of 3 Sep to 1 Oct, which may be a parser read to look at (not looked at, to keep the bill's contents out of the logs).

## 2026-10-29: 6.3 🔄 (check 3 of 8: `sum`, lines note)

Check 2 (bill month, billing period) was committed as 1953818. Check 3 built: the note under the utility lines. Shared: `linesNote` (tone, title, message) on the check response. Backend: pure `lib/bill/lines-note.ts` (table-tested: match, less, more, one cent off, no lines, no Current Charges, a line without an amount) and `checkBill` returns it next to the blockers. App: `LinesNote` component under the lines (quiet box with a check when they match; orange box with a warning and the difference when they do not, copy from the `sum` board), updated as lines are edited. It only warns; Save stays enabled, and the "Save with warnings?" dialog is check 8. The note is null while a line has no amount (check 4 adds the "N lines not found" note in that case).

Backend 235 tests pass (including the contract test parsing the real response); app bill-upload 14; ESLint and editor diagnostics clean. Not run on a device. Two things to know: real bills print Refuse Collection, Conservancy and GST besides the three utility lines, so lines from a real bill will usually not add up to Current Charges and the orange note will show most months (as the design intends, it is only a warning); and the synthetic fixture's own comment says its lines add up, but they total $330.00 against $381.50.

## 2026-10-29: 6.3 🔄 (check 3 of 8, reworked: lines against the Subtotal)

The `sum` check was changed after Francis pointed out the lines can never add up to Current Charges (GST is on top), so the warning would show every month. The lines note is now the shared Alert (the hand-built box had the wrong corners) and compares the lines with the bill's Subtotal, the charges before GST. Parser: Refuse Removal is a fourth line and the Subtotal is read, both from the second page's breakdown table (a line that starts with the label and ends in its total); the services are still read from the first page. Plain `unpdf` text, no positions, no AI. Shared: `subtotalCents` on the draft fields and the check request, not on save. Backend: `buildLinesNote(subtotalCents, lines)`; the fixture is now two pages mirroring the real bill's layout, with invented values (lines add up to the Subtotal). App: a read-only `SubtotalRow` under the lines; the Subtotal comes from the draft into each check request. Plan text, README and design-deviations B29 updated.

Backend 243 tests pass (parser tests cover the table rows, a quantity row, thousands separators, and the page 1 heading and a footnote not being read); app bill-upload 14; ESLint and editor diagnostics clean on the changed files. Not run on a device. The parser has not been run on the real bill; Francis checks that locally. GST and the layout of other months are not handled.

## 2026-10-29: 6.3 🔄 (check 3 of 8, after the first device look)

From the device screenshot: the lines note no longer shows when the lines match the Subtotal (only the warning is kept, so the shared `tone` field is gone and the app always draws the warning Alert), and the line rows are tighter (smaller gaps around the remove button, so the name field is wider for "Refuse Removal"). The remove button keeps its 44px size. README, plan text and B29 updated.

## 2026-10-29: 6.3 🔄 (check 3 of 8, keyboard)

Francis confirmed the new line row sizing. On Review bill the keyboard covered the focused amount field, the same problem the component test page had. The scroll area is now wrapped in a `KeyboardAvoidingView` with `behavior="padding"`, as on the test page (the Save and Cancel buttons stay under the keyboard while it is open, as they do there). Editor diagnostics and lint are clean; not yet run on the device.

## 2026-10-29: plan rule (keyboard)

Added a keyboard rule to the working rules at the top of the plan (step 3) and to the device check (step 6): any screen with a text or number input wraps its scroll area in a `KeyboardAvoidingView` with `behavior="padding"`; sheets keep the bottom sheet's own handling. Decided by Francis after the Review bill keyboard fix. Plan text only; no code changed.

## 2026-10-30: 6.3 🔄 (check 3 of 8, due date required)

Francis's mock bill with no due date saved without any warning, and the design's "Save with warnings?" dialog would not have opened for it. Decided with Francis: the Due date is a required field (the required-fields check, not a `partial` item). The form schema requires it ("Enter the due date", asterisk on the field), the save request schema requires it (400 otherwise), and the check endpoint and parser are unchanged. Tests: helper test for the form error, a route test row for the 400. README, plan text and design-deviations B30 updated. Home was read to confirm what a missing date does today: the bill row still shows (with the config's `billDueDay`, or no date), and Mark bill paid does not depend on it.

## 2026-10-30: 6.3 🔄 (check 3 of 8, empty required fields show their error)

On the mock bill with no due date the field was red-asterisked and Save was disabled, but no error text showed: the form only checks a field when it changes, so a field the bill left empty had no error yet. The form is now checked as a whole right after the server's read fills it in, so Due date, and any other required field the read left empty, show their error straight away. Editor diagnostics and lint clean; not yet checked on the device.

## 2026-10-30: 6.3 🔄 (check 3 committed as b7e1ba2; check 4 of 8: `partial`)

Check 3 (lines against the Subtotal, due date required, required errors shown after the read, keyboard avoiding, tighter line rows) was committed as b7e1ba2. Check 4 built: the parser now keeps a service whose heading is on the bill but whose amount is not as a line with no amount, and stops reading at the next block so it never takes the next service's amount. The server's lines note says "N lines not found" while any line has no amount (the sum is compared once all have one). On the form, such a line shows the dashed orange Add in place of the amount field and "Not found on the bill" under the row until filled; Add reveals the field and focuses it. A new fixture, `bill-partial.pdf` (no Water amount, written by `npm run generate:bill-fixture`), is for the device. README, plan text and design-deviations B31 updated.

Backend 249 tests pass (parser, note, read-bill and route contract tests for the new cases); app bill-upload 15; type checks for backend, shared and app clean; ESLint clean apart from one existing warning in `lib/prisma.ts`. Not run on a device. A line the user adds in 6.3's `addLine` check with an empty amount will count as "not found" in the note; `addLine` will decide how that reads.

## 2026-10-30: 6.3 🔄 (check 4 committed as 392ac24; check 5 of 8: `noLines`)

Check 4 (`partial`) was committed as 392ac24. Check 5 built: the "No lines found" box ("Optional. Current Charges is all the split needs.", the `noLines` board's copy) replaces the lines whenever the form has none, whether the bill had none or all were removed. It is drawn by the app, as B14 decided, so there is no server change. A new `NoLinesBox` component; the radius is the theme's alert radius (the board's 14px has no token). Editor diagnostics and lint clean; not run on a device. To see it: remove every line on a read bill.

## 2026-10-30: 6.3 🔄 (check 5 committed as f191567; check 6 of 8: `addLine`)

Check 5 (`noLines`) was committed as f191567. Check 6 built: Add line appends an inline row (an empty name and amount, as on the `addLine` board, not a sheet) and react-hook-form focuses its name field. A row with no name and no amount is ignored: left out of the server check and the save, and it does not block Save; a row with an amount needs a name; a row with a name and no amount is kept with no amount. A just-added row is a plain empty field, not a "not found on the bill" line. Helper tests added (app bill-upload 18 pass); type check, lint and diagnostics clean. Deviation B32 logged. Not run on a device: needs a check that the name field takes focus and that the new row scrolls into view above the keyboard.

## 2026-10-30: 6.3 🔄 (check 6 committed as 5211dcb; check 7 of 8: `unusual`)

Check 6 (`addLine`) was committed as 5211dcb. Check 7 built, server side only: a pure rule `lib/bill/unusual-bill.ts` (Current Charges more than 25% above or below the average of the last 3 saved bills; exactly 25% passes; fewer than 3 bills use what exists; no warning with no saved bills or no amount) and the check service now takes the db and reads the last 3 saved bills before the month (skipped when there is no amount). The check response gets `warnings`, holding the wording agreed with Francis, "This bill is X% higher/lower than your recent bills.". Per B11 it only appears in the "Save with warnings?" dialog, so nothing shows in the app until check 8, which also adds the lines warnings to the dialog.

Backend 264 tests pass (rule table, service with a fake db checking the query it makes, route contract with the new field); type checks for backend, shared and app clean; ESLint clean. Not seen on a device, because the dialog is check 8: the seeded Aug to Oct bills (about $400 on average) are what a new Nov bill is compared with.

## 2026-10-30: 6.3 🔄 (check 7 committed as 91545ef; check 8 of 8: `confirm`; all eight built)

Check 7 (`unusual`) was committed as 91545ef. Check 8 built: Save now asks the server for a check of exactly the current values, and when the response's `warnings` list is not empty it opens the "Save with warnings?" dialog, built on the shared `ConfirmDialog` (warning tone; "Go back and fix" filled; "Save anyway" neutral outline; spinner while saving; a failed save shown in the dialog; Go back clears that error). The server builds `warnings`: the lines note's title, then the unusual-bill line. The Save button also shows its spinner while the fresh check runs. An unreachable server shows the app's own prompt; other check failures do not stop the save. Switched the on-demand check to `queryClient.query`, because `fetchQuery` is deprecated in the installed TanStack Query. Deviation B33 logged (the dialog uses our line wording).

Backend 266 tests pass (service tests for the combined `warnings`); app bill-upload 18; type checks for backend, shared and app clean; ESLint clean. The editor still shows a stale hint for the old `fetchQuery` call. Not run on a device. All eight 6.3 checks are now built, so 6.3 stays 🔄 until Francis's device review (the checks one by one: required fields, month and period, lines note, partial, noLines, addLine, unusual, confirm).

## 2026-10-30: 6.3 ✅

Check 8 (`confirm`) was committed as 7268d21, and Francis approved 6.3 after the device review. All eight checks are in: required fields (Current Charges, Bill month, Due date, Billing period), bill month and billing period against the upload month, the lines against the Subtotal, lines not found with the Add button, "No lines found", the inline Add line, the unusual-bill warning, and the "Save with warnings?" dialog. Commits: 8abafaf, 1953818, b7e1ba2, 392ac24, f191567, 5211dcb, 91545ef, 7268d21. Deviations B14 to B33 are logged in `design-deviations.md`. The full type check across the workspace is still due at the end of Phase 6; per-step checks used editor diagnostics, the per-package type checks and lint.

## 2026-10-30: 6.4 🔄

Built `POST /api/months/:month/bill-draft/discard` (deletes the month's draft; a month with no draft answers the same) with its shared schema, service and route tests. On Review bill, Back, Cancel and the Android back gesture always open "Discard this bill?" (Francis's call, as the board draws it), and Discard deletes the draft and returns to Home. Home's Continue opens Review bill with the stored draft, and Discard draft deletes it with a Spinner on the button (`open-target.ts` became the `useOpenTarget` hook for that). Cancel while reading aborts the upload (`apiFetch` now takes a `signal`) and discards the draft. Deviations B34 to B37 logged; Q5 resolved.

Backend 269 tests and app 38 tests pass; type checks for app, shared and backend clean; app ESLint clean, backend ESLint has only the existing warning in `lib/prisma.ts`. Not run on a device yet.

## 2026-10-30: 6.4 ✅

Committed as 4ba582d and approved by Francis after the device review: Continue from both Home buttons, the "Discard this bill?" dialog from Back, the back gesture and Cancel, Home's Discard, and Cancel while a bill is read (tested with a temporary 5-second server delay, since removed). Added after the review: Continue is disabled while the draft is being discarded, and the notice's "Discard draft" button now reads "Discard" (Francis's change, logged as B38). Continue shows the values read from the bill, not edits made before leaving (as planned, B35). Backend 269 tests pass; app type check and lint clean.

## 2026-10-30: 6.5 🔄

The backend already stored an unreadable bill as a draft with `parseOk` false, returned `readOk: false`, and saved it as `NOT_PARSED`; added a letter-like fixture (`BILL_FIXTURE_UNREADABLE_PAGES`, written as `bill-unreadable.pdf` by `npm run generate:bill-fixture`) and a test that reads such a draft back. App: a read that finds nothing (on upload or Home's Continue) opens "Is this the right bill?" (`FailedStep`: danger Alert, file card, heading); Yes opens Review bill empty with the info Alert "Manual entry" (wording changed by Francis, B40) and the `unread` no-lines note (no Current Charges helper, B41); No and Back discard the draft and return to `pick`. The server check runs only on Review bill. Deviations B39 to B42 logged.

Backend bill tests (87) and app bill-upload tests (18) pass; app type check clean; ESLint clean for the changed files; no hex values. Not run on a device yet.

## 2026-10-30: 6.5 ✅

Committed as cc9ca27 and approved by Francis after the device review. Changed during the review: the typed-bill Alert reads "Manual entry / This bill could not be read. Values will be keyed in manually." (B40), Current Charges has no helper on a typed bill (B41), and a typed bill's empty fields show no errors until edited, while Save stays disabled until they are filled. `bill-unreadable.pdf` is generated on demand and gitignored.

## 2026-10-30: 6.6 🔄

Built View bill. Backend: `GET /api/months/:month/bill` (404 `no_bill`) with `shared/src/api/bill.ts`, the pure `lib/bill/build-bill-view.ts`, and `services/bill/bill-view.service.ts`, which reads the file's name and page count but never its bytes. Bill coverage moved out of `build-home.ts` into `lib/bill/bill-coverage.ts`, and the due-date helpers into `lib/home/due-dates.ts`, so Home and View bill share them. `Covered`, `Waiting`, `billDueInBadge` and `paidOnBadge` joined the central badge map. Per Francis: `unsent` shows `Not sent` per person, and the chips go Paid, Not sent, Overdue, Waiting (B3, B43). `BillFile` gains a nullable `pageCount` (migration `bill_file_page_count`), set on save (B46). The seeded November bill now has the board's three lines and a 3 Oct to 2 Nov period; past months have sample lines. App: route `bill/[month]/index.tsx` (a folder, because `bill/[month]/upload` already exists), `useBill`, `screens/bill/` with the `loading` skeleton, Home's `bill-view` target, and History's View bill link (U4). Bill upload's footer became the shared `SubpageFooter`. Open and Mark bill paid do nothing until 6.7 and 6.8. Deviations B43 to B49 logged; B3 and U4 updated.

Backend 301 tests pass. Type checks for backend, shared and app are clean, apart from the known `components/ui` errors; the app's typed routes were regenerated by starting Metro briefly. ESLint is clean on the changed files, the app's 38 tests pass, and there are no new hex values. The service was run against the reseeded `collecting` data for Nov, Oct and Aug. Not run on a device yet.

## 2026-10-30: 6.6 ✅

Francis approved View bill after the device review: `collecting` (and its Overdue chips at a later `DEV_NOW`), `unsent`, `settled`, the History month links, the loading skeleton, and light and dark. Changed during the review: person rows got 8px of vertical padding and centred chips (B50). Not committed yet. The full workspace type check is still due at the end of Phase 6.

## 2026-10-30: 6.6 committed as ded950b; 6.7 🔄

Built `GET /api/months/:month/bill/file`, which returns the stored PDF inline with an encoded file name; 404 `no_bill` or `no_file`, and route and service tests added. The seed now gives every saved bill (and the draft) the valid synthetic two-page PDF with its page count, in place of the placeholder. App: `apiFetch` now shares its request code with a new `apiFetchFile`, so a download gets the same session, timeout and unreachable-server handling. `lib/open-pdf.ts` writes the PDF to the cache and opens it with Android's view intent through its content URI, and `useOpenBillPdf` wraps both. Open shows a Spinner and a danger Alert under the row on failure, with copy agreed with Francis (B51, B52).

Backend 307 tests and app 38 tests pass. Type checks are clean (the typed routes had been regenerated with backend files in them and were regenerated again), and ESLint is clean on the changed files. Not run on a device yet: needs the chooser or viewer to open, and the no-viewer Alert if it can be reproduced.

## 2026-10-30: 6.7 ✅

Francis approved Open after the device test: the sample bill opens in the phone's PDF viewer from View bill on the current month and on History months, and an unreachable server shows the app's prompt. No new development build was needed. Not committed yet.

## 2026-10-30: 6.7 committed as f81a376; 6.8 🔄

Built Mark bill paid. Backend: `POST /api/months/:month/bill/paid` (`services/bill/mark-bill-paid.service.ts`; updates only an unpaid bill, so a second tap gets 409 `bill_paid`; 400 for a later day or an amount of zero or less; 404 `no_bill`). The bill response gains `paySheet`: Current Charges filled in, the due day, and the collected note (warning "You’ve collected … You’re covering …", or success "All … is collected"), null once paid. Seed scenario `fullyCollected` added (`DEV_NOW=2026-11-10T09:00:00+08:00`). App: `src/sheets/pay-bill/` (`PayBillSheet` on `AppSheet`, with a form for the amount and day) and `useMarkBillPaid`, which refetches Home, History and the bill before the sheet closes. Per Francis, each screen mounts its own sheet: Home through the new `HomeSheetsProvider` (the `mark-bill-paid` target), View bill from its footer. Deviations B53 to B56 logged.

Backend 319 tests, app 44 tests; type checks for backend, shared and app clean (typed routes regenerated again); ESLint clean on the changed files; no hex values. Not run on a device yet.

## 2026-10-30: 6.8 ✅

Francis approved Mark bill paid after the device review: the partial and full notes (`collecting`, `fullyCollected`), saving from View bill and from Home, the form checks, a failed save with Retry, the keyboard, and light and dark. Changed during the review: Amount paid and Paid on each got an × to empty them (`MoneyInput` gained an opt-in `clearable`), and the sheet closes after awaiting the save. The sheet did not close after saving because the bottom sheet wrapper (`components/ui/bottomsheet`) closed it by setting gorhom's `index` to -1, which gorhom ignores (it looks for a snap point at -1). It now calls gorhom's `close()`, as the back gesture did, which fixes closing from code for every sheet, Cancel included.

## 2026-10-30: 6.8 committed as eb94ade; 6.9 🔄 (parts 4 to 6)

At Francis's request the phase pass covers only dead code, the full checks and the deviations list. The on-device walk of every scenario, the end-to-end run, and the hex and 44px checks were skipped at the user's request, since each step was reviewed on device when it was built. Dead code: none found among the files and exports Phase 6 touched. The only removed file, `open-target.ts`, became `useOpenTarget` in 6.4, and the unused `screens/home/add-charge-sheet.tsx` spike is left for Phase 11. The full checks pass. Type check: `app`, `backend` and `shared` are clean, and the known `components/ui` errors are gone; the app's typed routes had to be regenerated first, because the running Metro (`expo start --clear`, watching the whole repo) adds every changed backend file to `.expo/types/router.d.ts` as a route. Lint: 0 errors and 2 warnings, both old (an unused disable in `backend/src/lib/prisma.ts` and one in the generated `router.d.ts`). Tests: backend 319, app 44, shared 110. Deviations: the Phase 6 header and B49 updated, B57 added (sheet subtitle size), the skipped checks noted, and B10, B12 and B17 carried forward.

## 2026-10-30: 6.9 ✅, Phase 6 ✅

Francis approved the phase pass (dead code, full checks, deviations list; the device walk, end-to-end run, and hex and 44px checks skipped at his request). Phase 6 is done: commits cc9ca27 (6.5), ded950b (6.6), f81a376 (6.7) and eb94ade (6.8) on top of the earlier 6.1 to 6.4 commits, all on `phase-6-bill-mgmt`. Open: the Metro typed-routes pollution (proposed fix: a `resolver.blockList` for `backend/` in `app/metro.config.js`, not applied).
