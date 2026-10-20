# SplitHouse: phased plan to implement docs/DESIGN.md

## Context

`docs/DESIGN.md` is the design reference: 18 screen components in `docs/design/source/*.dc.html` (each with `theme` plus a state prop), `docs/design/config.ts` and `global.css` (tokens), and the mapping doc (gluestack component per screen). It says: one screen at a time, every state built, both themes, no hex values, stop after each screen for review, and ask if something is missing.

Current repo state (from git and the spike findings):
- `backend/`: Next.js, Prisma with only the Better Auth tables (migration `init_better_auth`), Better Auth with Google + email allowlist (`src/lib/auth.ts`), route `api/auth/[...all]`. No split engine, no domain models, no API.
- `app/`: Expo SDK 57, expo-router with 3 files (`_layout`, `index`, `sign-in`), tokens installed (`src/components/ui/gluestack-ui-provider/config.ts`, `src/global.css`), copied-in gluestack components, custom `bottom-nav.tsx`, `chip.tsx`, `segmented-control.tsx`, spike `screens/home` and `screens/sign-in` (hard-coded sample data, simplified states). Dev build installed on device. Accordion works on device (the web preview misreported it). Google sign-in untested on device.

Decisions taken in this planning session:
- **Stay on gluestack v5 + NativeWind v5.** The Accordion works on device, so that spike concern is closed.
- **No carry-over.** The Data Model (Oct 15) wins over the design: the Mark paid carry/let-go Radio is not built (the sheet shows the shortfall as information). **Deferred to a future fix (rare case, Francis's call):** the History board "Dec 2026, unpaid carried" (`monthCarried`) and its "carried to January" banner/chip copy are NOT built in v1. Phase 9B skips that state.
- **Doc conflict to note, not blocking:** DESIGN.md refers to `design/config.ts` and `design/source/`; the files live in `docs/design/`. Mapping doc is still titled "Rent & Utils". The Brief's old "Review messages" boards were never redrawn and are out of scope.

## Working rules for every screen phase (the loop)

Repeat for each screen in a phase; stop for Francis's review after each (CLAUDE.md: don't commit unless asked).
1. Read `docs/design/source/<X>.dc.html` fully: the `c` token set in the script block, spacing, copy, every state value in `data-props`.
2. Read its row in the mapping doc for the gluestack components and custom pieces.
3. Build the screen under `app/src/screens/<name>/`, a route in `app/src/app/`, token classes only (no hex; grep before review: `#[0-9a-fA-F]{3,8}` in `app/src` excluding `config.ts`).
4. Implement every state in the DESIGN.md table for that screen: loading skeleton, saving, failed (sheet stays open, input kept, Retry), empty, error.
5. Wire to the real API when its backend phase is done. Until then, the screen takes props from a typed fixture file under `app/src/fixtures/` (fictional names Priya/Sam/Jordan, Nov 2026 cents) and is reachable from a dev-only `__gallery` route that lists every screen x state x theme.
6. Verify: `npx tsc --noEmit` (ignore the 21 known errors inside `components/ui/*`), `npm run lint`, then on device in light and dark, and compare to the source markup (and a canvas screenshot from Francis where the markup is ambiguous). Check 44px touch targets, label-above FormControl, Lucide icons only, Manrope weights.
7. Anything the design doesn't show: stop and ask. Do not invent copy or states.

---

## ✅ Phase 0: Stabilise the foundation (blocking)

Goal: remove spike risk before building ~18 screens on it.

- ✅ **0.1** **Accordion**: Francis confirms rows open and close on device, so the spike's "won't expand" report was a web-preview artefact; no fix needed. Only check on device that row amounts (`AccordionContentText`) are not visibly dimmed; if they are, remove the stray opacity/disabled class in `app/src/components/ui/accordion/index.tsx`. Treat the web preview as non-authoritative for native-only components.
- ✅ **0.2** **Verify the bottom sheet on device**: open `screens/home/add-charge-sheet.tsx` on the dev build; confirm snap points, keyboard handling (`BottomSheetTextInput`), backdrop = `scrim` token, 28px top radius, grabber = `track` token, Android back gesture closes it. Fix wrapper in `components/ui/bottomsheet`.
- ✅ **0.3** **Verify Select (month list), DateTimePicker (Android native dialog), Switch, Menu, Textarea, AlertDialog.** Add missing components with the gluestack CLI: `textarea`, `alert-dialog`, `radio`, `divider`, `popover` as needed. After each add, run the app bundle and fix missing `@react-aria/*`/`@react-stately/*` peers (known pattern; grep compiled imports).
- ✅ **0.4** **Google sign-in on device**: create the Android OAuth client with the EAS keystore SHA-1 (Account Setup Guide Phase B steps 6-7), set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, test sign-in, the 403 allowlist rejection, session persistence in `expo-secure-store`, and revoke-by-deleting-the-row behaviour (cookie caching stays off).
- ✅ **0.4a** **Spike sign-in screen on device (never tested in the spike)**: run `app/src/screens/sign-in/index.tsx` on the dev build and check each state it has today: `idle` (title, `GoogleSigninButton` renders and is tappable, layout in light and dark), `signing-in` (Spinner replaces the button), cancel from the account picker (returns to `idle`, no error text), `error` (e.g. airplane mode or bad `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: "Sign-in failed. Try again." shows and the button is back), `not-allowed` (non-allowlisted Google account: 403 maps to "This account isn't allowed to sign in."). Also confirm the account picker reappears on the next attempt after a rejection (the spike never calls `GoogleSignin.signOut()`; fix here if not) and that a successful sign-in leaves the screen via the session gate. Note any gaps in the spike findings doc; the full 5-state screen is rebuilt to the design in Phase 3 (3.1).
- ✅ **0.5** **Dev environment**: confirm the dev build connects to Metro from the personal machine (LAN mode); document in `app/README.md`.
- ✅ **0.6a** **Doc annotations (approved)**: add a one-line "Not built in v1, deferred" note to the Replace bill bullet in `docs/SplitHouse — Data Model.md` and to the History "carried" board row in `docs/DESIGN.md`; fix the `design/config.ts`, `design/global.css` and `design/source/` paths in `docs/DESIGN.md` to `docs/design/…`. Annotate only; nothing is deleted from the design.
- ✅ **0.6** **Housekeeping**: delete leftover gluestack scaffolding (`accordion/MIGRATION_SUMMARY.md`, `ANIMATION_CUSTOMIZATION.md`), confirm `tsconfig` alias `@/*` -> `src/*`, add npm scripts `typecheck`, `lint`.
- ✅ **0.7** **Theme sync check**: diff `docs/design/config.ts` and `docs/design/global.css` against `app/src/components/ui/gluestack-ui-provider/config.ts` and `app/src/global.css`; make the app copies identical in values (the spike fixed `--font-*`/`--text-*` namespaces in both). Confirm all 49 variables per theme exist and `bg-warning-tint`, `text-on-danger-tint`, `rounded-field/card/sheet/alert` classes resolve.
- ✅ **0.8** **Theme switching**: `_layout.tsx` follows `useColorScheme`; the real theme preference is built in Phase 2 (step 2.1a), not in Settings, so both themes can be tested before Settings exists.

Exit: sheet, select, date picker, switch, alert dialog all open on device; sign-in works end to end (0.4 and 0.4a); report written into the spike findings doc.

---

## 🔄 Phase 1: Backend foundation and the split engine (needed by every data screen)

Backend work, in `backend/`, follows the Data Model doc and CLAUDE.md. Check current Prisma/Next.js/Better Auth docs before writing (CLAUDE.md "Versions").

- ✅ **1.1** **Prisma schema** (`backend/prisma/schema.prisma`): add `Person`, `HouseholdVersion` (`startsFromMonth` unique, `schemaVersion`, `config Json`), `Month`, `Bill`, `BillFile`, `BillDraft`, `Charge`, `ChargeGroup`, `MessageEvent`, `Task`, `Settings` exactly as in the Data Model. Money fields `Int`. Enums: `ChargeCategory`, `SplitMethod`, `Scope`, `MessageKind`, `ParseStatus`. Migrate with `prisma migrate dev` using the direct URL; runtime uses the pooled URL.
- ✅ **1.2** **Config schema** (`backend/src/lib/household/config.ts`): zod schema for `HouseholdVersion.config` (per-person rent, utility share thousandths, aircon units, route DIRECT/VIA, due day per charge type, deposit; per-category totals and Francis/Primary basis points; recurring charges; templates and per-person overrides, custom labels). `schemaVersion` constant.
- **1.3** **Split engine** (`backend/src/lib/split/`, pure functions, no Prisma/Date.now): `splitByShares`, `splitByUnits`, `splitCustom` with rounding rule (everyone except Francis nearest cent half-up; Francis = total minus others), hard checks (utilities shares add to bill current charges; aircon shares to total; custom sums to total), and `buildMonthCharges(config, month)` for rent/recurring and `buildUtilitiesCharges(config, bill)`. Unit tests (`vitest`) against the Nov 2026 fixtures: 12369/8246/8246/12369 = 41230; 3667/1833/1833/3667 = 11000; landlord rent 430000; primary message total without aircon 190865; totals 186286, 10079, 183536.
- **1.4** **Seed (Nov 2026 plus the past 3 months)** (`backend/prisma/seed.ts`): fictional household (Priya/Sam/Jordan, placeholder +65 numbers), dev branch only (the script refuses to run unless `NODE_ENV !== 'production'` and the DB host matches the dev branch). Seeded through the same engine functions the app uses, so history is realistic and consistent:
  - **Versions:** version A starts 2026-08 (slightly different sample rent and utility shares, so past months differ from Nov), version B starts 2026-11 with the Nov 2026 fixtures. This also exercises the versioning rule (months use the newest version starting on or before them).
  - **Aug, Sep, Oct 2026 (past months):** each has a `Month` pinned to version A, rent and recurring (Starhub) charges, a saved sample utilities bill (synthetic fictional amounts, no real bill data) with a tiny placeholder PDF in `BillFile`, utilities charges, and `MessageEvent` rows (monthly and a nudge) so Recipient history has data.
  - **Payment states across those months** so History can show every case: Aug fully paid and settled; Sep fully paid but with a later correction charge (`correctsMonth` = Sep, so History shows the "corrected later" state); Oct with one charge short-paid (paid less than amount, difference is history only, no carry) and one still unpaid.
  - **Nov 2026 (current):** the fixtures exactly as in the Data Model, no bill uploaded yet and charges for rent/recurring only, so Home starts in the `upload` state. Utilities, aircon and messages are then created by testing the real flows.
  - **Dev clock:** the backend's `now()` helper (used by `currentMonth()` and lazy month open) honours an optional `DEV_NOW` env var (e.g. `2026-11-03T09:00:00+08:00`), ignored when `NODE_ENV === 'production'`, so the dev database can behave as if it is November before the real date arrives.
  - **Reset script:** `npm run seed:reset` wipes the domain tables (never the Better Auth tables) and reseeds, so test runs can start clean.
  - Fixture constants live in `backend/src/lib/fixtures/` and are shared by the seed and the unit tests, so the tests' Nov 2026 checks and the seeded data cannot drift apart.
- **1.5** **API conventions** (`backend/src/lib/api.ts`; stays on Next.js route handlers as decided; route files are thin wrappers of about 10 lines and all logic lives in plain functions under `backend/src/lib/`): `requireSession()` using `auth.api.getSession`, 401 JSON on none; zod request validation; error shape `{ error: { code, message } }`; Asia/Singapore `currentMonth()`; all route handlers `dynamic = 'force-dynamic'`. Health route `GET /api/health` (used by the app to detect cold start / unreachable).
- **1.6** **Lazy month open** (`openMonthIfNeeded()`): on first request on/after the 1st, create `Month`, pin current `HouseholdVersion`, create rent and recurring charges in one transaction; idempotent.
- **1.7** **Endpoints (v1 contract)** written as each screen needs them, listed per phase below. Keep the list in `backend/README.md`.
- **1.8** **Typed client**: shared TS types for responses. Simplest: `app/src/lib/api-types.ts` hand-synced from backend zod schemas (monorepo has no shared package; do not add one in v1). `app/src/lib/api.ts` fetch wrapper adding the Better Auth session token (from `authClient`), 20s timeout, maps network failure/timeout/5xx-cold-start to a `ServerUnreachableError`.
- **1.9** **Data hooks**: add TanStack Query (check current docs) in `app/`: `QueryClientProvider`, `useMonthSummary`, etc. Mutations invalidate affected keys. Retry policy: auto-retry reads twice with backoff (covers Neon cold start) before surfacing the blocking prompt.
- **1.10** **State management decision**: no global state library (no Redux/Zustand). Server data lives in TanStack Query; theme preference in one Context (2.1a); session in Better Auth's `useSession()`; sheet open/closed and selected month in local state or route params.
- **1.11** **Forms**: add `react-hook-form` and `zod` (with `@hookform/resolvers`; check current docs) to `app/`. Shared form schemas live in `app/src/lib/schemas/` (money as integer cents, month keys, E.164 phone), mirroring the backend's zod request schemas by hand. The Phase 2 field components (2.2) take a `control`/`name` so label, helper and error text come from the form state; `formState.isDirty` drives the "Discard unsaved changes" dialog; submit state drives the sheet scaffold's saving/failed states. Server validation errors map back onto fields.

Exit: engine tests green; seeded dev DB; `GET /api/health` and an authenticated `GET /api/me` work from the device.

---

## Phase 2: Theme, provider and shared pieces ("Suggested build order" step 1)

Create under `app/src/components/`:

- **2.1a** **Theme preference (real, not a stub)**: `app/src/lib/theme-preference.tsx` with `ThemePreferenceProvider` and `useThemePreference()` returning `{ preference: 'light' | 'dark' | 'system', resolved: 'light' | 'dark', setPreference }`. Persists the choice on the device with `expo-secure-store` or AsyncStorage (wrapped in try/catch; defaults to `system`), resolves `system` from `useColorScheme()`, and feeds `GluestackUIProvider mode` and the status bar style in `_layout.tsx`. The test page toggle (2.14) uses it, and Settings (Phase 10, step 10A.2) later reuses the same hook for its Appearance control with no new theme code.
- **2.1** **Provider/app shell** (`app/src/app/_layout.tsx`): `GestureHandlerRootView` > `GluestackUIProvider` > `BottomSheetModalProvider` > session gate (Phase 3). Status bar style follows theme, `expo-system-ui` background = `background` token (no white flash).
- **2.2** **`FormControl` wrapper** (`components/form-field.tsx`) on gluestack `form-control`: props `label`, `required` (marker), `helper`, `error`, children. Label 14/20 bold above, 6px gap, helper/error caption 12/16 below, 16px gap between controls. Variants: `TextField` (Input, 48px, radius 12, field text 16/24 medium), `MoneyField` (Input with `$` prefix, numeric keyboard, stores integer cents, shows 2 decimals, parse helper in `lib/money.ts`), `SelectField`, `MonthSelectField` (Select list of `YYYY-MM`, shown "Nov 2026"), `DateField` (DateTimePicker date mode, calendar icon), `TextareaField`, `PhoneField` (+65 prefix inside field). Check against `FormControls.dc.html` `fields` and `pickers` views, all states (default, focus, filled, error, disabled).
- **2.3** **`lib/money.ts`**: `formatCents(c)` -> `$1,862.86` (tabular numerals via font feature), `parseMoneyToCents(str)`, negative formatting for corrections. Display-only; no split maths in the app.
- **2.4** **`lib/month.ts`**: `YYYY-MM` keys, label formatting, current month in Asia/Singapore (match server).
- **2.5** **Button** variants from the design: primary (solid), outline, outline-danger (red outline), warning (Nudge), text, small (44px). 48px height, pill radius, 15/20 bold, loading state with `Spinner`, disabled = `bg-disabled text-on-disabled`.
- **2.6** **Alert** variants: info, warning, danger, success using `*-tint` / `*-line` / `on-*-tint` tokens, 16px radius, Lucide icons per mapping (`circle-alert`, `triangle-alert`, `info`, `circle-check`).
- **2.7** **Badge/status chips**: Paid (success-container), Due/Overdue (warning/danger), Due today (info), Nudged, Corrected, Unpaid, neutral (container).
- **2.8** **Bottom navigation** (`bottom-nav.tsx` exists; includes a dev-only fifth "Test" item that opens the component test page, see 2.14): switch from local state to expo-router `Tabs` layout (`app/src/app/(tabs)/_layout.tsx` with `tabBar={props => <BottomNav .../>}`): Home, History, Household, Settings; top shadow per elevation table (`0 -6px 14px rgba(0,0,0,.14)` light, `0 -8px 16px rgba(0,0,0,.45)` dark via `elevation`/shadow style), bottom inset via `useSafeAreaInsets`, 44px targets, selected pill uses `selected`/`on-selected`. Hidden on stack screens (Bill upload, Recipient, etc).
- **2.9** **Segmented control and chips** (`segmented-control.tsx`, `chip.tsx` exist): verify against Add charge, Household, Settings boards; same `value/onChange` API; selected = `bg-selected text-on-selected` + check icon for chips; single-select; 44px.
- **2.10** **Sheet scaffold** (`components/app-sheet.tsx`): wraps gluestack bottom sheet: grabber, title 20/28, close `x`, scroll body, sticky footer with Save/Cancel, `saving` (inputs disabled, button spinner) and `failed` (danger Alert above footer, "Try again" button, input values preserved) props. Used by Add charge, Mark paid, Record payment, Mark bill paid, Share bill.
- **2.11** **Dialog scaffold** (`components/confirm-dialog.tsx`) on `AlertDialog`: radius 24, filled Cancel, red-outline action. Used by Confirm boards and Discard draft, Save with warnings (neutral outline "Save anyway", filled "Go back and fix").
- **2.12** **Skeleton helpers** (`components/skeletons.tsx`) for card rows, lists.
- **2.13** **Screen header** (`components/screen-header.tsx`): page title 24/32 (tab screens) and back-arrow header with sheet-title 20/28 (stack screens); Android back gesture via router.
- **2.14** **Component test page (the Phase 2 deliverable)**: one route, `app/src/app/__components.tsx` (dev only, guarded by `__DEV__`, reachable from a fifth item in the bottom navigation bar, shown only when `__DEV__` is true, with a Lucide `flask-conical` icon and the label "Test"; absent from release builds), so everything is tested in one pass on the phone. One scrollable page, sections in this order, each with a heading and each interactive piece fully working (not static mocks):
  - **Theme toggle** pinned at the top of the test page (does not depend on Settings): Light / Dark / System segmented control wired to `useThemePreference()` (2.1a). It switches the whole app live and the choice persists across app restarts, so both themes are checked on every component without leaving the page.
  - **Buttons**: primary, outline, outline-danger, warning (Nudge), text, small (44px); each in default, pressed, loading, disabled.
  - **Form fields** (match `FormControls.dc.html` `fields` view): TextField, MoneyField (type `1862.86`, check it shows `$1,862.86` and yields 186286 cents), PhoneField (+65 prefix), TextareaField; each in default, filled, required, helper, error, disabled.
  - **Pickers** (match `pickers` view): SelectField, MonthSelectField (tap, list opens, choose Nov 2026), DateField (native Android dialog), Switch.
  - **Segmented control** (Shared / Personal) and **single-select chips** (split method, Who) with live selected value printed beneath.
  - **Alerts**: info, warning, danger, success.
  - **Badges and status chips**: Paid, Due, Overdue, Due today, Nudged, Corrected, Unpaid, neutral.
  - **Cards, Progress, Accordion** (with 3 sample rows), **Skeleton** blocks, **Spinner**.
  - **Bottom sheet scaffold**: buttons "Open sheet (idle)", "Open sheet (saving)", "Open sheet (failed)" showing grabber, title, close, scrolling body, sticky footer, keyboard behaviour with a field inside, Android back gesture closes it. A "Fake save" button runs idle -> saving -> failed -> retry -> success.
  - **Dialogs**: Confirm (filled Cancel + red-outline action), Save with warnings (Go back and fix / Save anyway).
  - **Server-unreachable prompt**: a button that triggers the blocking "Can't reach the server" state with Retry (full version wired in Phase 3).
  - **Bottom navigation** rendered at the bottom of the page with working tab highlight.
  - **Screen headers**: tab-style title and back-arrow style.
  - **Touch-target overlay switch**: toggles a debug outline on anything under 44px to check targets quickly.
  - **Hex check**: no hex in the page or kit (grep run before review).
- **2.15** Compare the test page with `FormControls.dc.html` (both views) and the mapping doc; fix differences; then Francis runs the page on device in both themes and signs off before Phase 3. This page stays in the app (dev only) and gains new shared pieces over time; later screen phases use its `__gallery` states for per-screen state review.

Exit: Francis can open the single test page on the phone, exercise every shared component in light and dark, and approves it; later phases use only these pieces.

---

## Phase 3: Sign in and session ("Sign in & session")

Source: `SignIn.dc.html`, `Returning.dc.html`, `ServerError.dc.html`. Replaces spike `screens/sign-in`.

- **3.1** **Sign in screen**, 5 states by `state` prop: `out` (title, tagline, Google button), `signing` (button replaced/disabled with Spinner), `failed` (danger Alert "Sign-in failed" + button re-enabled), `notAllowed` (danger Alert for non-allowed account; map the 403 from the `databaseHooks` check; also call `GoogleSignin.signOut()` so the account picker reappears), `ended` (info/warning Alert "Your session ended, sign in again" shown when a 401 arrives while signed in). Google button follows Google branding (custom piece, per mapping). Copy exactly from the source.
- **3.2** **Session gate** (`app/src/lib/session.tsx`): `useSession()` from `authClient`; routes: no session -> `/sign-in`; session -> bootstrap. Any API 401 clears the session, routes to sign-in with `state=ended`.
- **3.3** **New-phone behaviour**: after sign-in call `revokeOtherSessions` (Tech Stack). Verify the old session dies immediately.
- **3.4** **Returning user screen** (`Returning`): shown after sign-in when household data exists; Card + Spinner while fetching `/api/bootstrap` and rebuilding reminders (Phase 12 hook; stub now). If bootstrap says no household -> First run (Phase 4).
- **3.5** **Backend**: `GET /api/bootstrap` -> `{ hasHousehold, currentMonth, setupProgress, settings }`.
- **3.6** **Server error prompt** (`ServerError`): global `ServerUnreachableProvider`: renders a blocking `AlertDialog`-style full screen when any query/mutation throws `ServerUnreachableError`; `idle` state shows cloud-off icon, copy, Retry; `retrying` shows Spinner and disabled button. Retry re-runs `queryClient.refetchQueries` for failed queries / `GET /api/health` first. Pending mutations are not auto-replayed (user re-taps).
- **3.7** Verify on device: airplane mode; Neon cold start (wait 6 minutes, launch); expired session; wrong Google account; light + dark.

---

## Phase 4: First run, then Household

### 4A. First run ("Welcome", 3 states)
- **4A.1** `Welcome` `state=empty`, `progress`, `notifications`: Card with 4-segment step indicator (custom Progress), "2 of 4 steps done", rows: household/people, rent & shares, recurring charges, reminders (optional). Row detail copy from source.
- **4A.2** Each step opens the matching Household editor screen (Phase 4B) in a "first setup" mode where the first version may start at the go-live month (Nov 2026), the only allowed exception.
- **4A.3** **Reminders step**: explainer then `Notifications.requestPermissionsAsync()`; on grant mark step done; on denial show the blocked state and continue (optional step). Android 13+ runtime permission.
- **4A.4** Backend: `GET /api/setup/progress`, derived from household version + settings; `POST /api/setup/complete` not needed (derived). Home is reachable once steps 1-3 are done.

### 4B. Household (8 states)
Source `Household.dc.html` (largest file, 48KB; read in full).
- **4B.1** Backend: `GET /api/household` (current version, upcoming version if any, people, per-version history), `POST /api/household/preview` (config draft + starts-from -> per-person amounts via split engine; this is what the edit preview card shows; **the app never calculates**), `POST /api/household/versions` (validates: starts-from must be after current month, except first version; shares add to 100%/totals; creates a new immutable version), `POST /api/people` / person updates go through versions (name and WhatsApp live on `Person`; everything else in config), `DELETE` of a person = a new version excluding them (never hard-delete), plus `removeVersion` for a not-yet-started future version only.
- **4B.2** `view` overview: Cards for each person (route chip Directly/Via someone, rent, shares), landlord rent summary, 50/50 split bars (custom two-segment Progress), version/"starts from" badges, Add person button. `loading` skeleton.
- **4B.3** Edit screens/sheets by state: `editPerson` (Tenant 2 from Jan 2027 with preview), `editPrimary` (rename, rename applies immediately on Person), `editTenant1` (segmented Directly/Via someone per charge type, Applies-to Select), `editHome` (landlord rent from Jan 2027), `addPerson` (empty form, +65 PhoneField), `splitError` (shares not adding to 100% -> danger Alert + disabled Save).
- **4B.4** "Starts from" MonthSelectField lists only months after the current month (first setup: current month allowed). Live preview via debounced call to `/api/household/preview`; show Spinner in the preview card while fetching.
- **4B.5** Confirmations (Phase 10): removePerson, removeVersion, discard unsaved changes (back with dirty form).
- **4B.6** Required markers and label-above on every field; verify against FormControls.

Exit: a household can be created from scratch and edited; a version cannot start in the current/past month (API test + UI disables).

---

## Phase 5: Home ("Main", 7 states)

Source `Main.dc.html` (40KB). Replaces spike `screens/home`.

- **5.1** Backend `GET /api/months/:month/summary`: calls `openMonthIfNeeded`, returns derived status (`bill_missing | draft | unsent | collecting | settled`), hero totals (collected of total, using paid cents), per-person rows with line items and paid/overdue/due-today/nudged flags, alerts (aircon due, unusual bill), draft info. Status derivation lives in one backend function (`deriveMonthStatus`) with unit tests for each Home state.
- **5.2** UI states: `loading` (skeleton hero + rows), `upload` (bill not uploaded: Upload bill primary CTA), `unsent` (bill in, messages not sent: "Review messages" per-person list), `collecting` (Tenant 2 rent overdue, nudged), `dueToday` (info chip), `settled` (all paid, success treatment), `draft` (leftover draft Alert with Continue / Discard).
- **5.3** Hero card: amount 34/40 800, "of $X collected", Progress. Person rows use the Accordion with line items; rows show Paid/Due/Overdue/Due today badges; tapping a row's action opens Recipient (Phase 7) or Mark paid (Phase 8).
- **5.4** Add charge entry: a text button/row opening Add charge sheet (Phase 9) (no FAB, per mapping).
- **5.5** Mark bill paid entry from the bill card (Phase 6).
- **5.6** Month switching not on Home (History handles past months).

---

## Phase 6: Bill upload, View bill, Share, Mark bill paid

### 6A. Backend bill pipeline
- **6A.1** `POST /api/months/:month/bill-draft` (multipart PDF): check PDF magic bytes + size limit (single constant `MAX_BILL_PDF_BYTES`, starts at 5 MB; Francis checks his real bill size and we adjust), store in `BillDraft` (one per month, replaces prior, lazy purge), parse with `unpdf` -> provider-neutral `BillParser` interface -> `SpGroupParser`; return `{ parseOk, fields, lines, warnings }`. Develop parser against the real bill in `assets-old/` locally only; **never print contents or copy the file**; unit tests use synthetic text fixtures only.
- **6A.2** Validations: current charges required; billing period vs month -> `period` warning; lines vs current charges -> `sum` warning only; unusual vs recent months -> warning.
- **6A.3** `POST /api/months/:month/bill` (save): one transaction moves draft to `Bill` + `BillFile` and creates utilities charges via the engine; Rejects a save when the month already has a bill (no Replace path in v1). `POST .../bill-draft/discard`, `GET .../bill/file` (stream PDF), `POST .../bill/paid` (Mark bill paid: amount, date, note).
- **6A.4** `BillFile` storage behind `save/get/delete` interface.

### 6B. Bill upload (13 states)
Source `BillUpload.dc.html`. Steps: `pick`, `reading`, `review`, `discard`, `period`, `sum`, `confirm`, `partial`, `addLine`, `noLines`, `readingFail`, `failed`, `unread`.
- **6B.1** `pick`: `expo-document-picker` (PDF only, check size on device), Card with file name.
- **6B.2** `reading`: Spinner + copy; `readingFail` shows the failure inline.
- **6B.3** `review`: FormControls Bill month (MonthSelect), Current Charges (MoneyField, required, helper "Required. The split uses this number."), Billing period (two DateFields), Due date, lines list with editable amounts, Choose another file link. Nothing saved until Save.
- **6B.4** Warning Alerts for `period`, `sum`, `partial`, `noLines`, `unread`; `confirm` = AlertDialog "Save with warnings?" (Go back and fix filled / Save anyway neutral outline); `discard` = AlertDialog; `addLine` = sheet with label + amount.
- **6B.5** `failed` screen "Is this the right bill?": Card + Alert + Yes (keep file, NOT_PARSED, type amounts) / No (discard, pick again). Manual entry with no file also supported.
- **6B.6** **Replace bill is out of scope for v1 (Francis's decision).** It stays in the design and Data Model but is not built: no Replace button on View bill, no replace endpoint, no per-person difference dialog. Bill upload is offered only when the month has no saved bill. A wrong bill is fixed with a correction charge (Phase 9A).

### 6C. View bill, Mark bill paid, Share
- **6C.1** `Bill` (`loading`, `collecting`, `paid`): Card with period/due/total, lines, Open PDF row (**decided: external viewer, no in-app PDF library**: the Open button downloads `GET /api/months/:month/bill/file` to the cache folder, then fires Android's open-file intent (e.g. `expo-sharing` or `expo-intent-launcher` with a `FileProvider` content URI; check current Expo docs), so Android shows its "open with" app chooser; the Bill screen's custom "PDF viewer" piece is just this handoff; show a Spinner on the row while downloading and a danger Alert if it fails or no PDF app exists), Progress for collected vs bill, Mark paid button (hidden when paid). No Replace bill button in v1.
- **6C.2** `PayBill` sheet: `collected=partial|full`, amount, Paid on DateField, note; partial shows info Alert of difference; no carry Radio. States idle/saving/failed.
- **6C.3** `Share` sheet (3 boards: `pdf`, `summary`, `system`): Radio PDF vs Summary, Switch options, Share button -> `expo-sharing`/`Share.share` system sheet with the stored PDF (cache file) or summary text. Reached from Recipient.

---

## Phase 7: Recipient and messages

Source `Recipient.dc.html` (5 states: `notSent`, `sent`, `paid`, `paidDifferent`, `nudged`).

- **7.1** Backend: `GET /api/months/:month/recipients/:personId` -> breakdown lines, rendered monthly message from the template (placeholders `{name}`, `{amount}`, `{month}`, `{charge}`, `{dueDate}`, etc.; render function in backend `lib/messages/render.ts` with unit tests incl. Tagalog default text in the Brief), unpaid corrections from earlier months, history of `MessageEvent`s. `POST .../message-events` (kind MONTHLY|NUDGE, stores `renderedText`, `openedAt`).
- **7.2** UI: Card with breakdown (rows, Divider, total), message preview card (custom formatting preserving line breaks, emoji), buttons: "Send on WhatsApp" (`Linking.openURL('https://wa.me/<E164 digits>?text=<encodeURIComponent>')`), "Send again", "Nudge again", Share bill button (opens Phase 6C Share), Mark paid.
- **7.3** Record the event **after** the intent opens (and on failure to open WhatsApp show an Alert, no event). Never auto-send, no send-all. One person at a time.
- **7.4** States: show Sent/Nudged timestamps (Asia/Singapore), Paid badge, `paidDifferent` info (paid amount vs expected).
- **7.5** Entry from Home rows and notification taps.

---

## Phase 8: Payments (Mark paid and Record payment)

Source `MarkPaid.dc.html` (`full`, `different`, `record`, `recordOpen`, `recordForOpen` + `save`).

- **8.1** Backend: `POST /api/charges/:id/payment` (paidCents, paidOn, paidByPersonId), `POST /api/payments` (Record payment: from person, for charge(s)/person, amount, date; marks matching charges paid and who paid), `DELETE`/undo not in design (don't add). Marking Tenant 2's rent received creates the `Task` (SAVINGS_TRANSFER). Short payment: store what was received; difference is history only (no carry).
- **8.2** `MarkPaid` sheet: expected vs received, "Full amount" default, "Different amount" reveals MoneyField, Received on DateField, shortfall/overpayment as info Alert (**no carry/let-go Radio**, per Data Model).
- **8.3** `Record payment`: From and For SelectFields (open states are just the Select open), prefilled when launched from a row or notification Paid action.
- **8.4** Saving/failed states via the Phase 2 sheet scaffold.
- **8.5** After success invalidate month summary, Recipient, History; reschedule dependent notifications (Phase 12).

---

## Phase 9: Add charge and History

### 9A. Add charge (5 states)
Source `AddCharge.dc.html`.
- **9A.1** Backend: `POST /api/charges/preview` (mode, split method, total, who, custom amounts, month) -> per-person cents via engine; `POST /api/charges` creates `ChargeGroup` + charges in one transaction (amounts stored, never recalculated). `Correction` = personal charge with `correctsMonth`, signed amount.
- **9A.2** UI sheet: segmented Shared / Personal, single-select chips for split method (Per share, Per unit, Custom) and Who, Label, Amount (MoneyField), Month being fixed (MonthSelect, corrections), Due date, Note. Live preview card from the preview endpoint (debounced, Spinner while loading); `error` state (custom split doesn't add up) = danger Alert + Save disabled; Saving/Failed via scaffold. Replaces spike `add-charge-sheet.tsx`.

### 9B. History (4 states)
Source `History.dc.html`.
- **9B.1** Backend: `GET /api/history` (months list: bill total, paid count, chips), `GET /api/history/:month` (charges with paid state, corrections, banner flags). Derived, no new tables.
- **9B.2** `list`, `loading`, `monthCorrected` (info Alert "corrected later" linking to the correction charges), `monthCarried` is **deferred to a future fix**: a month with an unpaid charge just shows the normal Unpaid chip on that row, with no carry banner or "carried to Jan" copy.
- **9B.3** Read-only except opening a charge.

---

## Phase 10: Settings, Notifications UI and Confirmations

### 10A. Settings (5 states)
Source `Settings.dc.html` (33KB).
- **10A.1** Backend: `GET/PUT /api/settings` (notification toggles per channel/type); message templates are part of the versioned household config, so template edits go through `POST /api/household/versions` with "starts from" (Settings "Applies to" Select: everyone / a person).
- **10A.2** `view`: Account Card (signed-in email, Sign out, no confirmation dialog per mapping), Appearance (segmented Light/Dark/System bound to the existing `useThemePreference()` from step 2.1a; no new theme logic), Messages (links to template editors), Notifications (Switches per channel/type).
- **10A.3** `template` / `override` / `nudge`: Textarea editors (label above), placeholder chips to insert, preview card with segmented sample selector (custom), per-person override via Applies-to Select; Save creates a version (starts-from rule applies).
- **10A.4** `blocked`: when notification permission is denied, warning Alert + "Open system settings" (`Linking.openSettings()`, external-link icon); re-check on app foreground.
- **10A.5** Sign out: `authClient.signOut()`, clear query cache, `GoogleSignin.signOut()`, cancel scheduled notifications.

### 10B. Confirmations
Source `Confirm.dc.html`: `removePerson`, `removeVersion`, `discard`. Wire to Household (4B) and every dirty sheet (back/close with changes). Filled Cancel, red-outline action.

---

## Phase 11: Notifications ("Notifications" boards are a copy reference, not screens)

Source `Notifications.dc.html` (`headsUp`, `shade`) for copy, channel names, action labels, small icon. Tech Stack table defines triggers.

- **11.1** `expo-notifications` channels: Action needed (high, heads-up), Payment checks, FYI (low/silent); create on launch.
- **11.2** Action buttons: Paid -> opens Record payment sheet via deep link `splithouse://payments/new?charge=<id>`; Nudge -> opens WhatsApp nudge via Recipient with nudge intent (needs foreground). Register categories with `setNotificationCategoryAsync`.
- **11.3** Scheduler `app/src/lib/notifications/schedule.ts`: input = month summary + settings; cancels all and reschedules (idempotent) on sign-in, launch, and after every mutation (new bill, payment, due-date edit, setting toggle). Date-based: upload bill (about the 2nd, daily until done), collect Tenant 1's rent (last working day before the 1st), Pay utilities bill with live "collected $X of $Y", per-charge "Did {name} pay {charge}?". Event-based immediate: Transfer $950 to savings (when Tenant 2 rent marked received), month settled, unusual bill, aircon due.
- **11.4** Backend `GET /api/notifications/plan` returns computed trigger list so scheduling logic stays server-side/testable (preferred, mirrors "split engine only in backend"); app only schedules.
- **11.5** Tap routing with `expo-router` + `Notifications.useLastNotificationResponse`.
- **11.6** Test on device overnight for delivery delay (Tech Stack "Reminder delay"), no exact-alarm permission.

---

## Phase 12: Hardening and release

- **12.1** Dark-mode sweep of all 18 components x all states via `__gallery`; hex grep; touch targets; font weights.
- **12.2** Layout nudges the design warned about: taller label-above forms (MarkPaid different amount, failed sheets), Settings `blocked`; keyboard-avoiding in sheets; small phone and large font scale.
- **12.3** Accessibility: labels on icon buttons, contrast of tokens already designed, focus order.
- **12.4** Public-repo hygiene scan: no real names/numbers/amounts in code, tests, seed, README; `.env.example` names only; no `assets-old` content.
- **12.5a** **Backup bucket account setup (Francis, by hand; add as a new section to `docs/SplitHouse — Account Setup Guide.md`)**: create a free Cloudflare account and enable R2 (**decided: Cloudflare R2**; chosen over Backblaze B2 for free egress so restores cost nothing, a 10 GB free tier that includes 1M writes and 10M reads a month, and S3-compatible tooling; B2 is the fallback). R2 enabling goes through a checkout flow for an R2 subscription; the docs do not say whether a card is required, so check at signup and confirm Francis is fine with that. Create a private bucket named `split-house-backups` (no public access, no custom domain). Create an API token scoped to that single bucket with write/read only (no account-wide key, no delete rights if the provider allows). Note the endpoint URL, access key ID and secret in a password manager. Set a lifecycle rule to expire objects after about 60 days (or the job prunes to the last 8).
- **12.5b** **GitHub secrets (Francis, in the repo's Settings > Secrets and variables > Actions)**: `NEON_DIRECT_URL` (direct, not pooled, read-only role if Neon allows), `BACKUP_PASSPHRASE` (also saved in the password manager; without it backups can't be restored), `BACKUP_BUCKET`, `BACKUP_ENDPOINT`, `BACKUP_ACCESS_KEY_ID`, `BACKUP_SECRET_ACCESS_KEY`. Add the names (no values) to `.env.example` or the setup guide.
- **12.5c** **Workflow** `.github/workflows/backup.yml`: weekly cron plus manual `workflow_dispatch`; steps: install the Postgres client matching Neon's major version, `pg_dump --format=custom`, encrypt with `age`/`gpg` using the passphrase, upload to the bucket with an S3-compatible CLI, prune older than the last 8, fail the job (GitHub emails Francis) on any error. No dump or secret is ever printed to logs or kept as a public artifact.
- **12.5d** **Restore test, once before go-live**: download the latest object, decrypt, `pg_restore` into a scratch Neon branch, check row counts for `Charge`, `Bill`, `BillFile` and that a bill PDF opens; delete the scratch branch. Write the restore steps in `backend/README.md` (no secrets).
- **12.6** Production: Vercel project `split-house-api`, env vars, Neon prod branch migration (`prisma migrate deploy`), seed *real* household through the app's First run (not through code), EAS production-profile APK, new-phone test (install, sign in, old session revoked, reminders rebuilt).
- **12.7** Go-live check for the Nov 2026 cycle: end-to-end dry run on the dev branch with fixtures: set up household, open month, upload (test) bill, preview messages, WhatsApp open, record payments, corrections, settle.

---

## Critical files

- `docs/DESIGN.md`, `docs/design/source/*.dc.html`, `docs/design/config.ts`, `docs/design/global.css`
- Existing to extend: `app/src/app/_layout.tsx`, `app/src/components/bottom-nav.tsx`, `segmented-control.tsx`, `chip.tsx`, `app/src/components/ui/*`, `app/src/lib/auth-client.ts`, `app/src/screens/home/*`, `app/src/screens/sign-in/*`
- Backend: `backend/prisma/schema.prisma`, `backend/src/lib/auth.ts`, `backend/src/lib/prisma.ts`, new `backend/src/lib/split/`, `backend/src/lib/household/`, `backend/src/lib/bill/`, `backend/src/app/api/**`

## Verification (every phase)

- Backend: `npm test` (engine and derivation unit tests on Nov 2026 fixtures), `npx tsc --noEmit`, `npm run lint`, hit endpoints with the dev session against the Neon dev branch.
- App: `npx tsc --noEmit`, `npm run lint`, `npx expo-doctor`; dev build on Francis's phone; each state in `__gallery` in light and dark; real-flow test of the screens built in that phase against the dev API.
- Rules audit before closing a phase: integer cents only; app contains no split maths; nothing sends automatically; online-only blocking prompt works; no hex values; no real personal data.

## Open items for Francis

1. History "carried" state: deferred to a future fix (decided).
2. View bill PDF: decided, external viewer via Android's app chooser.
3. Backup destination: decided, encrypted weekly dump to an object-storage bucket (Cloudflare R2, steps 12.5a-d).
4. Replace bill: decided, not built in v1 (design stays, feature deferred).
