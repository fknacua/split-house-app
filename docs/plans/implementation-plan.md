# SplitHouse: phased plan to implement docs/DESIGN.md

## Context

`docs/DESIGN.md` is the design reference: 18 screen components in `docs/design/source/*.dc.html` (each with `theme` plus a state prop), `docs/design/config.ts` and `global.css` (tokens), and the mapping doc (gluestack component per screen). It says: one screen at a time, every state built, both themes, no hex values, stop after each screen for review, and ask if something is missing.

Current repo state (from git and the spike findings):
- `backend/`: Next.js, Prisma with only the Better Auth tables (migration `init_better_auth`), Better Auth with Google + email allowlist (`src/lib/auth.ts`), route `api/auth/[...all]`. No split engine, no domain models, no API.
- `app/`: Expo SDK 57, expo-router with 3 files (`_layout`, `index`, `sign-in`), tokens installed (`src/components/ui/gluestack-ui-provider/config.ts`, `src/global.css`), copied-in gluestack components, custom `bottom-nav.tsx`, `chip.tsx`, `connected-button-group.tsx`, spike `screens/home` and `screens/sign-in` (hard-coded sample data, simplified states). Dev build installed on device. Accordion works on device (the web preview misreported it). Google sign-in untested on device.

Decisions taken in this planning session:
- **Stay on gluestack v5 + NativeWind v5.** The Accordion works on device, so that spike concern is closed.
- **No carry-over.** The Data Model (Oct 15) wins over the design: the Mark paid carry/let-go Radio is not built (the sheet shows the shortfall as information). **Deferred to a future fix (rare case, Francis's call):** the History board "Dec 2026, unpaid carried" (`monthCarried`) and its "carried to January" banner/chip copy are NOT built in v1. Phase 4 skips that state.
- **Doc conflict to note, not blocking:** DESIGN.md refers to `design/config.ts` and `design/source/`; the files live in `docs/design/`. Mapping doc is still titled "Rent & Utils". The Brief's old "Review messages" boards were never redrawn and are out of scope.

## Working rules for every screen phase (the loop)

Repeat for each screen in a phase; stop for Francis's review after each (CLAUDE.md: don't commit unless asked).
1. Read `docs/design/source/<X>.dc.html` fully: the `c` token set in the script block, spacing, copy, every state value in `data-props`.
2. Read its row in the mapping doc for the gluestack components and custom pieces.
3. Build the screen under `app/src/screens/<name>/`, a route in `app/src/app/`, token classes only (no hex; grep before review: `#[0-9a-fA-F]{3,8}` in `app/src` excluding `config.ts`). The route file stays a thin wrapper that renders the screen, and the screen's root is the shared `Screen` component (2.13a), so the background and the top safe-area inset come from one place and are never re-added per screen.
4. Implement every state in the DESIGN.md table for that screen: loading skeleton, saving, failed (sheet stays open, input kept, Retry), empty, error.
5. Wire to the real API when its backend phase is done. Until then, the screen takes props from a typed fixture file under `app/src/fixtures/` (fictional names Priya/Sam/Jordan, Nov 2026 cents) and is reachable from a dev-only `__gallery` route that lists every screen x state x theme.
6. Verify: VS Code diagnostics on each changed file for type errors (the full `npx tsc --noEmit` runs at the end of the phase, ignoring the known errors inside `components/ui/*`), `npm run lint`, then on device in light and dark, and compare to the source markup (and a canvas screenshot from Francis where the markup is ambiguous). Check 44px touch targets, label-above FormControl, Lucide icons only, Manrope weights.
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

## ✅ Phase 1: Backend foundation and the split engine (needed by every data screen)

Backend work, in `backend/`, follows the Data Model doc and CLAUDE.md. Check current Prisma/Next.js/Better Auth docs before writing (CLAUDE.md "Versions").

- ✅ **1.1** **Prisma schema** (`backend/prisma/schema.prisma`): add `Person`, `HouseholdVersion` (`startsFromMonth` unique, `schemaVersion`, `config Json`), `Month`, `Bill`, `BillFile`, `BillDraft`, `Charge`, `ChargeGroup`, `MessageEvent`, `Task`, `Settings` exactly as in the Data Model. Money fields `Int`. Enums: `ChargeCategory`, `SplitMethod`, `Scope`, `MessageKind`, `ParseStatus`. Migrate with `prisma migrate dev` using the direct URL; runtime uses the pooled URL.
- ✅ **1.2** **Config schema** (`backend/src/lib/household/config.ts`): zod schema for `HouseholdVersion.config` (per-person rent, utility share thousandths, aircon units, route DIRECT/VIA, due day per charge type, deposit; per-category totals and Francis/Primary basis points; recurring charges; templates and per-person overrides, custom labels). `schemaVersion` constant.
- ✅ **1.3** **Split engine** (`backend/src/lib/split/`, pure functions, no Prisma/Date.now): `splitByShares`, `splitByUnits`, `splitCustom` with rounding rule (everyone except Francis nearest cent half-up; Francis = total minus others), hard checks (utilities shares add to bill current charges; aircon shares to total; custom sums to total), and `buildMonthCharges(config, month)` for rent/recurring and `buildUtilitiesCharges(config, bill)`. Unit tests (`vitest`) against the Nov 2026 fixtures: 12369/8246/8246/12369 = 41230; 3667/1833/1833/3667 = 11000; landlord rent 430000; primary message total without aircon 190865; totals 186286, 10079, 183536.
- ✅ **1.4** **Seed (Nov 2026 plus the past 3 months)** (`backend/prisma/seed.ts`): fictional household (Priya/Sam/Jordan, placeholder +65 numbers), dev branch only (the script refuses to run unless `NODE_ENV !== 'production'` and the DB host matches the dev branch). Seeded through the same engine functions the app uses, so history is realistic and consistent:
  - **Versions:** version A starts 2026-08 (slightly different sample rent and utility shares, so past months differ from Nov), version B starts 2026-11 with the Nov 2026 fixtures. This also exercises the versioning rule (months use the newest version starting on or before them).
  - **Aug, Sep, Oct 2026 (past months):** each has a `Month` pinned to version A, rent and recurring (Starhub) charges, a saved sample utilities bill (synthetic fictional amounts, no real bill data) with a tiny placeholder PDF in `BillFile`, utilities charges, and `MessageEvent` rows (monthly and a nudge) so Recipient history has data.
  - **Payment states across those months** so History can show every case: Aug fully paid and settled; Sep fully paid but with a later correction charge (`correctsMonth` = Sep, so History shows the "corrected later" state); Oct with one charge short-paid (paid less than amount, difference is history only, no carry) and one still unpaid.
  - **Nov 2026 (current):** the fixtures exactly as in the Data Model, no bill uploaded yet and charges for rent/recurring only, so Home starts in the `upload` state. Utilities, aircon and messages are then created by testing the real flows.
  - **Dev clock:** the backend's `now()` helper (used by `currentMonth()` and lazy month open) honours an optional `DEV_NOW` env var (e.g. `2026-11-03T09:00:00+08:00`), ignored when `NODE_ENV === 'production'`, so the dev database can behave as if it is November before the real date arrives.
  - **Reset script:** `npm run seed:reset` wipes the domain tables (never the Better Auth tables) and reseeds, so test runs can start clean.
  - Fixture constants live in `backend/src/lib/fixtures/` and are shared by the seed and the unit tests, so the tests' Nov 2026 checks and the seeded data cannot drift apart.
- ✅ **1.5** **API conventions** (`backend/src/lib/api.ts`; stays on Next.js route handlers as decided; route files are thin wrappers of about 10 lines and all logic lives in plain functions under `backend/src/lib/`): `requireSession()` using `auth.api.getSession`, 401 JSON on none; zod request validation; error shape `{ error: { code, message } }`; Asia/Singapore `currentMonth()`; all route handlers `dynamic = 'force-dynamic'`. Health route `GET /api/health` (used by the app to detect cold start / unreachable).
- ✅ **1.6** **Lazy month open** (`openMonthIfNeeded()`): on first request on/after the 1st, create `Month`, pin current `HouseholdVersion`, create rent and recurring charges in one transaction; idempotent.
- ✅ **1.7** **Endpoints (v1 contract)** written as each screen needs them, listed per phase below. Keep the list in `backend/README.md`.
- ✅ **1.8** **Typed client**: shared TS types for responses. Simplest: `app/src/lib/api-types.ts` hand-synced from backend zod schemas (monorepo has no shared package for now; a shared schemas package is required before go-live, see 8.0). **Superseded by Phase 3.5 (2026-10-24): response types now live in `shared/src/api/` and `api-types.ts` only holds the Phase 5 placeholder.**. `app/src/lib/api.ts` fetch wrapper adding the Better Auth session token (from `authClient`), 20s timeout, maps network failure/timeout/5xx-cold-start to a `ServerUnreachableError`.
- ✅ **1.9** **Data hooks**: add TanStack Query (check current docs) in `app/`: `QueryClientProvider`, `useMonthSummary`, etc. Mutations invalidate affected keys. Retry policy: auto-retry reads twice with backoff (covers Neon cold start) before surfacing the blocking prompt.
- ✅ **1.10** **State management decision**: no global state library (no Redux/Zustand). Server data lives in TanStack Query; theme preference in one Context (2.1a); session in Better Auth's `useSession()`; sheet open/closed and selected month in local state or route params.
- ✅ **1.11** **Forms**: add `react-hook-form` and `zod` (with `@hookform/resolvers`; check current docs) to `app/`. Shared form schemas live in `app/src/lib/schemas/` (money as integer cents, month keys, E.164 phone), mirroring the backend's zod request schemas by hand for now (replaced by a shared package before go-live, see 8.0). **Superseded by Phase 3.5 (2026-10-24): the shared form primitives are now in `shared/src/schemas/primitives.ts` and `app/src/lib/schemas/` is gone.** The Phase 2 field components (2.8 to 2.12) take a `control`/`name` so label, helper and error text come from the form state; `formState.isDirty` drives the "Discard unsaved changes" dialog; submit state drives the sheet scaffold's saving/failed states. Server validation errors map back onto fields.

Exit: engine tests green; seeded dev DB; `GET /api/health` and an authenticated `GET /api/me` work from the device.

---

## ✅ Phase 2: Theme, provider and shared pieces ("Suggested build order" step 1)

Shared pieces go under `app/src/components/`.

**Working rule for this phase:** the provider shell is built first (2.2), then the test page shell (2.3). Every later step that builds a component also adds its section to the test page in that same step, fully working and in every state, and is not done until it shows there.

**Test page rule (Francis, 2026-10-23): storybook-like, with mock data.** The test page shows each shared component on its own, the way Storybook does. It does not depend on the app's real content (real tabs, routes, people, amounts or screens). Each section passes its own mock props and holds its own state. So a shared component takes its content as props and never reads app content as a default; the real app passes the real content at its call site.

**Wrapper rule for every shared component (set by the Button, 2.5):** do not build a new component when gluestack has a native one.
- **Native (`components/ui/<name>`):** holds the looks: variants, sizes, colours, shapes, and the disabled and pressed states. Customise the copied file in place.
- **Wrapper (`components/<name>.tsx`):** our own props, designed from the native ones, translated to what the native component needs. It adds only behaviour the native one lacks (for Button: `loading`, the label and icon composition) and exposes no gluestack types. Screens import only the wrapper, so swapping the library means rewriting the wrappers (ESLint `no-restricted-imports` enforces this; direct `components/ui` imports need a disable comment with a reason).
- **Form inputs (set by 2.9):** every input is a bare wrapper that works standalone and, with the optional `fieldControlProps`, is form-controlled (`withFormControlledField` in `components/form-field/`). Later fields (MoneyField, SelectField, DateField, ...) follow the same pattern, so the Controller and `FormField` wiring is written once.
- **Before writing a wrapper:** read the VS Code diagnostics for the native component it wraps (not a full `tsc`) and fix every type error, lint error and warning in it (for example the known ones in `ui/alert-dialog`, `ui/popover`, `ui/calendar`, `ui/date-time-picker`), so the wrapper sits on a clean base. Report anything you cannot fix without changing behaviour instead of suppressing it.
- **Custom pieces with no gluestack native** (connected button group, single-select chips, bottom navigation) stay custom, as the mapping doc says.

- ✅ **2.1a** **Theme preference (real, not a stub)**
  - **Build:** `app/src/lib/theme-preference.tsx` with `ThemePreferenceProvider` and `useThemePreference()` returning `{ preference: 'light' | 'dark' | 'system', resolved: 'light' | 'dark', setPreference }`.
  - Persists the choice on the device with `expo-secure-store` or AsyncStorage (wrapped in try/catch; defaults to `system`).
  - Resolves `system` from `useColorScheme()`; feeds `GluestackUIProvider mode` and the status bar style in `_layout.tsx`.
  - **Reuse:** the test page toggle (2.3) uses it, and Settings (Phase 9, step 9A.2) later reuses the same hook for its Appearance control with no new theme code.

- ✅ **2.2** **Provider/app shell** (`app/src/app/_layout.tsx`)
  - **Build:** `GestureHandlerRootView` > `GluestackUIProvider` > `BottomSheetModalProvider` > session gate (Phase 3).
  - Status bar style follows theme; `expo-system-ui` background = `background` token (no white flash).
  - **Test page:** none yet; the page is built in 2.3 and checks both themes through this shell. The **Server-unreachable prompt** section goes on the page when the step that builds it lands (this one if it does, otherwise Phase 3): a button that triggers the blocking "Can't reach the server" state with Retry.

- ✅ **2.3** **Component test page shell**
  - **Build:** one route, `app/src/app/__components.tsx`, dev only (guarded by `__DEV__`, absent from release builds), so everything is tested on the phone in one place. One scrollable page.
  - **Access:** until the bottom navigation exists (2.13), reach it from a temporary dev-only link on the Home route (`app/src/app/index.tsx`), removed in 2.13.
  - **Scope:** this step builds only the shell and the two pinned controls below. Every later step adds its own section (heading plus fully working pieces, not static mocks) and names it in its **Test page** line.
  - **Theme toggle**, pinned at the top (does not depend on Settings): Light / Dark / System ConnectedButtonGroup wired to `useThemePreference()`. It switches the whole app live and persists across restarts, so both themes are checked on every component without leaving the page.
  - **Touch-target overlay switch**, also pinned near the top: toggles a debug outline on anything under 44px.

- ✅ **2.4** **Segmented control and chips** (`segmented-control.tsx`, `chip.tsx` exist)
  - **Design update, Oct 22 (done separately, step stays ✅):** the controls were reworked to the Round 2 design. `segmented-control.tsx` became `connected-button-group.tsx` (`ConnectedButtonGroup`): 2px gap, no outer border, 48px (44px compact), selected is a `primary` pill, no check icon. `chip.tsx` lost its check icon and has a fixed 1px border, radius 22, `primary` fill when selected. See DESIGN.md.
  - **Build:** verify against the Add charge, Household and Settings boards. Same `value/onChange` API; selected = `bg-selected text-on-selected` + check icon for chips; single-select; 44px. The 2.3 theme toggle already uses the segmented control.
  - **Test page:** add the **Segmented control** (Shared / Personal) and **single-select chips** (split method, Who) section, with the live selected value printed beneath.

- ✅ **2.5** **Button**
  - **Build:** variants from the design: primary (solid), outline, outline-danger (red outline), warning (Nudge), text, small (44px).
  - 48px height, pill radius, 15/20 bold; loading state with `Spinner`; disabled = `bg-disabled text-on-disabled`.
  - **Test page:** add the **Buttons** section: every variant in default, pressed, loading, disabled.

- ✅ **2.6** **Alert**
  - **Build:** variants info, warning, danger, success using `*-tint` / `*-line` / `on-*-tint` tokens, 16px radius.
  - Lucide icons per mapping: `circle-alert`, `triangle-alert`, `info`, `circle-check`.
  - **Test page:** add the **Alerts** section: info, warning, danger, success.

- ✅ **2.7** **Badge/status chips**
  - **Build:** Paid (success-container), Due/Overdue (warning/danger), Due today (info), Nudged, Corrected, Unpaid, neutral (container).
  - **Test page:** add the **Badges and status chips** section with all of the above.

- ✅ **2.8** **`FormControl` wrapper and TextField** (`components/form-field.tsx`)
  - **Build:** on gluestack `form-control`. Props: `label`, `required` (marker), `helper`, `error`, children.
  - **Layout:** label 14/20 bold above, 6px gap, helper/error caption 12/16 below, 16px gap between controls.
  - **TextField:** Input, 48px, radius 12, field text 16/24 medium.
  - **Check against:** `FormControls.dc.html` `fields` view, all states (default, focus, filled, error, disabled).
  - **Test page:** add the **Form fields** section with TextField in default, filled, required, helper, error, disabled.

- ✅ **2.9** **TextareaInput and PhoneInput, and the form-controlled input pattern** (`components/textarea-input.tsx`, `components/phone-input.tsx`, `components/form-field/`)
  - **Pattern (also applies to `TextInput` from 2.8):** each input is a bare wrapper over the native gluestack input (standalone: `value`, `onChange`, no label). Passing the optional `fieldControlProps` (type `FieldControlProps<T>`: `control`, `name`, `label`, `required`, `helper`, `error`, `disabled`, `className`) makes the same input form-controlled: bound to that react-hook-form field and wrapped in the label-above `FormField`. The two modes are a discriminated union (`StandaloneFieldProps` or `FormControlledFieldProps<T>`). One helper, `withFormControlledField`, adds the branch, built on the `useFormControlledField` hook, so each input file holds only its bare component. The render-prop `FieldControl` stays as an escape hatch.
  - **Build:**
    - `TextareaInput`: 96px field on a restyled `ui/textarea` (same look as the input).
    - `PhoneInput`: shows an editable `+65` while empty so other countries work; value is `+` and digits, checked with `e164Phone` (`z.e164()`).
  - **Check against:** `FormControls.dc.html` `fields` view, all states.
  - **Test page:** add both to the **Form fields** section, each in default, filled, required, helper, error, disabled, plus a **Bare inputs** group with no form.

- ✅ **2.10** **MoneyInput and `lib/money.ts`** (named `MoneyInput`, not `MoneyField`, to match `TextInput` and `PhoneInput`; later steps that say MoneyField mean this component)
  - **Build `lib/money.ts`:** `formatCents(c)` -> `$1,862.86`, `parseMoneyToCents(str)`, negative formatting for corrections (`-$15.00`), plus `sanitizeMoneyInput` and `centsToInputText` for typing. Display-only; no split maths in the app. First app lib with unit tests: vitest added to `app/` (`npm test`, `src/lib/*.test.ts`); app libs get tests from now on.
  - **Build `MoneyInput`:** bare input following the 2.9 pattern, value is integer cents (`number | null`), shows the typed text while focused and `$1,862.86` on blur, optional `allowNegative` +/- button. The shared pattern gained `withFormControlledFieldOf<Own, R, V>` for non-string values (type arguments passed explicitly); `withFormControlledField` is unchanged for string inputs.
  - **Test page:** MoneyInput added to **Form fields** (live, filled, negative, error, disabled, bare); typing `1862.86` shows `$1,862.86` and yields 186286 cents.

- ✅ **2.11** **SelectField, MonthSelectField and `lib/month.ts`**
  - **Build `lib/month.ts`:** `YYYY-MM` keys, label formatting, current month in Asia/Singapore (match server).
  - **Build `SelectField`**, and **`MonthSelectField`**: Select list of `YYYY-MM`, shown "November 2026" (as in the design source).
  - **Check against:** `FormControls.dc.html` `pickers` view, all states.
  - **Test page:** add the **Pickers** section with SelectField and MonthSelectField (tap, list opens, choose November 2026).

- ✅ **2.12** **DateField and Switch**
  - **Build:** `DateField` (DateTimePicker date mode, calendar icon), and the gluestack `Switch`.
  - **Check against:** `FormControls.dc.html` `pickers` view, all states.
  - **Test page:** add both to the **Pickers** section (DateField opens the native Android dialog).
  - **Note (Francis, 2026-10-23):** `ui/date-time-picker` and `ui/calendar` are already deleted (the app is Android only, so `DateField` is a custom field that opens the system dialog directly). Where this plan lists them as known errors or unused code (Phase 2 wrapper rule, 12.4a), they no longer exist.

- ✅ **2.13** **Bottom navigation** (`bottom-nav.tsx` exists)
  - **Build:** switch from local state to an expo-router `Tabs` layout (`app/src/app/(tabs)/_layout.tsx` with `tabBar={props => <BottomNav .../>}`): Home, History, Household, Settings.
  - **Style:** top shadow per elevation table (`0 -6px 14px rgba(0,0,0,.14)` light, `0 -8px 16px rgba(0,0,0,.45)` dark via `elevation`/shadow style); bottom inset via `useSafeAreaInsets`; 44px targets; selected pill uses `selected`/`on-selected`.
  - Hidden on stack screens (Bill upload, Recipient, etc).
  - **Test item:** add the dev-only fifth item (Lucide `flask-conical`, label "Test", shown only when `__DEV__` is true) that opens the test page, and remove the temporary Home link from 2.3.
  - **Test page:** add the **Bottom navigation** section with working tab highlight, using mock items (see the test page rule above).

- ✅ **2.13a** **Screen wrapper** (`components/screen.tsx`, added during 2.13 at Francis's request, 2026-10-23)
  - **Build:** `Screen`, a `PropsWithChildren` wrapper every screen route renders inside, so page-level chrome changes in one place. It owns `flex-1 bg-background` and the top safe-area inset; scrolling and the bottom inset stay with the screen and the bottom nav. Optional `className`.
  - **Used by:** the tab routes (Home, History, Household, Settings) and the test page. Screens built later render inside it.
  - **Test page:** the test page itself is built on `Screen`, which is its demo (the status-bar inset replaces the old `pt-12`).

- ✅ **2.14** **Sheet scaffold** (`components/app-sheet.tsx`)
  - **Build:** wraps the gluestack bottom sheet: grabber, title 20/28, close `x`, scroll body, sticky footer with Save/Cancel.
  - **Props:** `saving` (inputs disabled, button spinner) and `failed` (danger Alert above footer, "Try again" button, input values preserved).
  - **Used by:** Add charge, Mark paid, Record payment, Mark bill paid, Share bill.
  - **Test page:** add the **Bottom sheet scaffold** section.
    - Buttons "Open sheet (idle)", "Open sheet (saving)", "Open sheet (failed)" showing grabber, title, close, scrolling body, sticky footer.
    - Keyboard behaviour with a field inside; Android back gesture closes it.
    - A "Fake save" button runs idle -> saving -> failed -> retry -> success.

- ✅ **2.15** **Dialog scaffold** (`components/confirm-dialog.tsx`)
  - **Build:** on `AlertDialog`: radius 24, filled Cancel, red-outline action.
  - **Used by:** Confirm boards and Discard draft; Save with warnings (neutral outline "Save anyway", filled "Go back and fix").
  - **Test page:** add the **Dialogs** section: Confirm, and Save with warnings.

- ✅ **2.16** **Skeleton helpers** (`components/skeletons.tsx`)
  - **Build:** skeletons for card rows and lists.
  - **Test page:** add the **Skeleton** blocks.

- ✅ **2.17** **Screen header** (`components/screen-header.tsx`)
  - **Build:** page title 24/32 (tab screens) and back-arrow header with sheet-title 20/28 (stack screens); Android back gesture via router.
  - **Test page:** add the **Screen headers** section: tab-style title and back-arrow style.

- ✅ **2.18** **Final pass over the test page**
  - Compare it with `FormControls.dc.html` (both views) and the mapping doc; fix differences.
  - Add any section still missing: Cards, Progress, Accordion (with 3 sample rows), Spinner, if no earlier step added them.
  - Run the hex grep over the page and kit (none allowed).
  - **Clear the TODO lint disables:** list them with `grep -rn "TODO: replace with a wrapper" app/src`. Replace each one in code that stays (the provider import in `_layout.tsx`, `__verify.tsx`, `__components.tsx`) by importing the wrapper from `src/components`, adding the missing wrapper first where there isn't one. The spike screens (`screens/home`, `screens/sign-in`) are rebuilt in Phases 3, 5 and 11, so their disables go away when each screen is rewritten with wrappers; list what is left at the end of Phase 2. No new disables without a reason that names a plan step.
  - Francis runs the page on device in both themes and signs off before Phase 3.
  - The page stays in the app (dev only) and gains new shared pieces over time; later screen phases use its `__gallery` states for per-screen state review.

Exit: Francis can open the single test page on the phone, exercise every shared component in light and dark, and approves it; later phases use only these pieces.

---

## ✅ Phase 3: Sign in and session ("Sign in & session")

Source: `SignIn.dc.html`, `Returning.dc.html`, `ServerError.dc.html`. Replaces spike `screens/sign-in`.

- ✅ **3.1** **Sign in screen**, 5 states by `state` prop: `out` (title, tagline, Google button), `signing` (button replaced/disabled with Spinner), `failed` (danger Alert "Sign-in failed" + button re-enabled), `notAllowed` (danger Alert for non-allowed account; map the 403 from the `databaseHooks` check; also call `GoogleSignin.signOut()` so the account picker reappears), `ended` (info/warning Alert "Your session ended, sign in again" shown when a 401 arrives while signed in). Google button follows Google branding (custom piece, per mapping). Copy exactly from the source.
- ✅ **3.2** **Session gate** (`app/src/lib/session.tsx`): `useSession()` from `authClient`; routes: no session -> `/sign-in`; session -> bootstrap. Any API 401 clears the session, routes to sign-in with `state=ended`.
- ✅ **3.3** **New-phone behaviour**: after sign-in call `revokeOtherSessions` (Tech Stack). Verify the old session dies immediately.
- ✅ **3.4** **Returning user screen** (`Returning`): shown after sign-in when household data exists; Card + Spinner while fetching `/api/bootstrap` and rebuilding reminders (Phase 9B hook; stub now). If bootstrap says no household -> First run (Phase 10).
- ✅ **3.5** **Backend**: `GET /api/bootstrap` -> `{ hasHousehold, currentMonth, setupProgress, settings }`.
- ✅ **3.6** **Server error prompt** (`ServerError`): global `ServerUnreachableProvider`: renders a blocking `AlertDialog`-style full screen when any query/mutation throws `ServerUnreachableError`; `idle` state shows cloud-off icon, copy, Retry; `retrying` shows Spinner and disabled button. Retry re-runs `queryClient.refetchQueries` for failed queries / `GET /api/health` first. Pending mutations are not auto-replayed (user re-taps).
- ✅ **3.7** Verify on device: airplane mode; Neon cold start (wait 6 minutes, launch); expired session; wrong Google account; light + dark.

---

## ✅ Phase 3.5: Shared package (done 2026-10-24, before Phase 4)

Pulled forward from 8.0 so the History response types are written once. npm workspaces (`backend`, `app`, `shared`) with one root lockfile; `shared/` is `@splithouse/shared`, source-only TypeScript with `zod`, `date-fns` and `@date-fns/tz`. Layout: `src/api/` (request and response zod schemas, types inferred), `src/schemas/` (primitives, household config, settings, setup steps) and `src/lib/` (money, month, date). Rule: pure code only, and the split engine stays in `backend/`. Every new endpoint adds its schemas to `shared/src/api/`, and a backend test checks the real response against the schema (see `bootstrap.test.ts`, `api/me/route.test.ts`).

- ✅ **3.5.1** Workspace spike: single React 19.2.3 / RN 0.86.3 (backend React pinned to match the app), backend `next build`, Metro Android export and device checks pass.
- ✅ **3.5.2** Moved the schemas, constants, parsers and response types; moved month, date and money (with tests) out of the app; the backend keeps a thin `currentMonth()` over `now()` for `DEV_NOW`.
- ✅ **3.5.3** Contract tests for `/api/me` and `/api/bootstrap`.
- ☐ **3.5.4** Still to check with Francis's go-ahead: Vercel preview deploy (Root Directory `backend`, "include source files outside the root directory") and an EAS development build from `app/`. Run `eas build` from `app/`, commit first.

---

## Build order from Phase 4 (set 2026-10-23)

Phases 0 to 3 are done and keep their numbers. From Phase 4 the phases run in the order below, so every screen is built and checked against the seeded dev database before the screens that exist to enter real data. First run is a launcher over other screens, so it comes after them. Add charge is a nice to have (a wrong bill is rare, and a correction charge is its only must-have use), so it comes after First run. Phase 12 stays last as the final cleanup and release.

| Phase | Screens | Was |
|---|---|---|
| 4 | History | 9B |
| 5 | Home | 5 |
| 6 | Bill upload, View bill, Mark bill paid | 6, without Share |
| 7 | Payments (7A), then Recipient and Share (7B) | 8, 7 and 6C.3 |
| 8 | Household, Confirmations | 4B and 10B (the shared package was done earlier as Phase 3.5) |
| 9 | Settings (9A), Notifications (9B) | 10A and 11 |
| 10 | First run | 4A |
| 11 | Add charge | 9A |
| 12 | Hardening and release | 12, without 12.5e |

Old step IDs map to new ones as follows. Older entries in `docs/plans/implementation-plan_progress.md` use the old numbers.
- 9B.1 to 9B.3 are now 4.1 to 4.3. Phase 5 and Phase 6 steps keep their IDs, except 6C.3, which is now 7B.6.
- 8.1 to 8.5 are now 7A.1 to 7A.5. 7.1 to 7.5 are now 7B.1 to 7B.5.
- 4B.1 to 4B.6 are now 8.1 to 8.6 (10B is folded into 8.5). 12.5e is now 8.0.
- 10A.1 to 10A.5 are now 9A.1 to 9A.5. 11.1 to 11.6 are now 9B.1 to 9B.6.
- 4A.1 to 4A.4 are now 10.1 to 10.4. 9A.1 and 9A.2 are now 11.1 and 11.2.

---

## Phase 4: History (4 states)

Source `History.dc.html`. Built first as a quick win: it is read-only and the Aug to Oct 2026 seed covers it, so it proves the whole path (endpoint, query hook, skeleton, both themes, on device) before Home.

- **4.1** (was 9B.1) Backend: `GET /api/history` (months list: bill total, paid count, chips), `GET /api/history/:month` (charges with paid state, corrections, banner flags). Derived, no new tables.
- **4.2** (was 9B.2) States: `list`, `loading`, `monthCorrected` (info Alert "corrected later" linking to the correction charges). Here it renders from the seeded Sep correction; the link to the correction charge stays a stub until Add charge (Phase 11). `monthCarried` is **deferred to a future fix**: a month with an unpaid charge just shows the normal Unpaid chip on that row, with no carry banner or "carried to Jan" copy.
- **4.3** (was 9B.3) Read-only except opening a charge. Read `History.dc.html` for what opening a charge opens; if the source doesn't show it, stop and ask. Until that target exists, the row does nothing.
- **4.4** Check against the seed: Aug (fully paid), Sep (corrected later), Oct (one charge short-paid, one unpaid).

---

## Phase 5: Home ("Main", 7 states)

Source `Main.dc.html` (40KB). Replaces spike `screens/home`. Home renders from the database: no state needs a flow (bill upload, payments) to be reached.

- **5.0** **Seed scenarios** (extends 1.4): `npm run seed:reset -- --scenario <name>` reseeds the same Aug to Oct history and household versions, then sets up Nov 2026 as the scenario says, built through the engine and the shared fixtures. Scenarios:
  - `upload` (the default, as seeded today): rent and recurring charges only, no bill.
  - `draft`: a `BillDraft` row with synthetic parsed fields and a placeholder PDF.
  - `unsent`: bill and utilities charges saved, no `MessageEvent` rows.
  - `collecting`: messages sent, some charges paid, Tenant 2's rent overdue and nudged.
  - `dueToday`: as `collecting`; the script prints the `DEV_NOW` that makes a charge due today.
  - `settled`: everything paid.
  - `aircon-due`: the aircon alert state.
  - Not seeded: an unusual bill and short payments. `loading` is a `__gallery` state.
- **5.1** Backend `GET /api/months/:month/summary`: calls `openMonthIfNeeded`, returns derived status (`bill_missing | draft | unsent | collecting | settled`), hero totals (collected of total, using paid cents), per-person rows with line items and paid/overdue/due-today/nudged flags, alerts (aircon due, unusual bill), draft info. Status derivation lives in one backend function (`deriveMonthStatus`) with unit tests for each Home state.
- **5.2** UI states: `loading` (skeleton hero + rows), `upload` (bill not uploaded: Upload bill primary CTA), `unsent` (bill in, messages not sent: "Review messages" per-person list), `collecting` (Tenant 2 rent overdue, nudged), `dueToday` (info chip), `settled` (all paid, success treatment), `draft` (leftover draft Alert with Continue / Discard). Each state is checked on device by reseeding its scenario (5.0).
- **5.3** Hero card: amount 34/40 800, "of $X collected", Progress. Person rows use the Accordion with line items; rows show Paid/Due/Overdue/Due today badges. A row's action opens Recipient (Phase 7B) or Mark paid (Phase 7A); until those phases land the actions are stubs.
- **5.4** Add charge entry: a text button/row opening the Add charge sheet (Phase 11) (no FAB, per mapping). Hidden until Phase 11.
- **5.5** Mark bill paid entry from the bill card (wired in Phase 6).
- **5.6** Month switching not on Home (History handles past months).

---

## Phase 6: Bill upload, View bill, Mark bill paid

### 6A. Backend bill pipeline
Start with 6A.1: the parser depends on the real bill's layout and is the riskiest unknown, so find problems before the UI is built on it.
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
- **6B.6** **Replace bill is out of scope for v1 (Francis's decision).** It stays in the design and Data Model but is not built: no Replace button on View bill, no replace endpoint, no per-person difference dialog. Bill upload is offered only when the month has no saved bill. A wrong bill is fixed with a correction charge (Add charge, Phase 11).

### 6C. View bill and Mark bill paid
- **6C.1** `Bill` (`loading`, `collecting`, `paid`): Card with period/due/total, lines, Open PDF row (**decided: external viewer, no in-app PDF library**: the Open button downloads `GET /api/months/:month/bill/file` to the cache folder, then fires Android's open-file intent (e.g. `expo-sharing` or `expo-intent-launcher` with a `FileProvider` content URI; check current Expo docs), so Android shows its "open with" app chooser; the Bill screen's custom "PDF viewer" piece is just this handoff; show a Spinner on the row while downloading and a danger Alert if it fails or no PDF app exists), Progress for collected vs bill, Mark paid button (hidden when paid). No Replace bill button in v1.
- **6C.2** `PayBill` sheet: `collected=partial|full`, amount, Paid on DateField, note; partial shows info Alert of difference; no carry Radio. States idle/saving/failed.
- **6C.3** The Share sheet moved to Recipient, its only entry point: see 7B.6.

---

## Phase 7: Payments and Recipient

Payments first, because Recipient has the Mark paid button and the `paid` and `paidDifferent` states.

### 7A. Payments (Mark paid and Record payment)
Source `MarkPaid.dc.html` (`full`, `different`, `record`, `recordOpen`, `recordForOpen` + `save`).

- **7A.1** (was 8.1) Backend: `POST /api/charges/:id/payment` (paidCents, paidOn, paidByPersonId), `POST /api/payments` (Record payment: from person, for charge(s)/person, amount, date; marks matching charges paid and who paid), `DELETE`/undo not in design (don't add). Marking Tenant 2's rent received creates the `Task` (SAVINGS_TRANSFER). Short payment: store what was received; difference is history only (no carry).
- **7A.2** (was 8.2) `MarkPaid` sheet: expected vs received, "Full amount" default, "Different amount" reveals MoneyField, Received on DateField, shortfall/overpayment as info Alert (**no carry/let-go Radio**, per Data Model).
- **7A.3** (was 8.3) `Record payment`: From and For SelectFields (open states are just the Select open), prefilled when launched from a row or notification Paid action.
- **7A.4** (was 8.4) Saving/failed states via the Phase 2 sheet scaffold.
- **7A.5** (was 8.5) After success invalidate month summary, Recipient, History; reschedule dependent notifications (Phase 9B, stubbed until then). Wire the Home row actions (5.3) to the Mark paid sheet.

### 7B. Recipient and messages
Source `Recipient.dc.html` (5 states: `notSent`, `sent`, `paid`, `paidDifferent`, `nudged`).

- **7B.1** (was 7.1) Backend: `GET /api/months/:month/recipients/:personId` -> breakdown lines, rendered monthly message from the template (placeholders `{name}`, `{amount}`, `{month}`, `{charge}`, `{dueDate}`, etc.; render function in backend `lib/messages/render.ts` with unit tests incl. Tagalog default text in the Brief), unpaid corrections from earlier months, history of `MessageEvent`s. `POST .../message-events` (kind MONTHLY|NUDGE, stores `renderedText`, `openedAt`). The templates come from the household config, so the seeded versions are enough until the editors exist (Phase 8, Phase 9A).
- **7B.2** (was 7.2) UI: Card with breakdown (rows, Divider, total), message preview card (custom formatting preserving line breaks, emoji), buttons: "Send on WhatsApp" (`Linking.openURL('https://wa.me/<E164 digits>?text=<encodeURIComponent>')`), "Send again", "Nudge again", Share bill button (opens the Share sheet, 7B.6), Mark paid (opens the 7A.2 sheet).
- **7B.3** (was 7.3) Record the event **after** the intent opens (and on failure to open WhatsApp show an Alert, no event). Never auto-send, no send-all. One person at a time.
- **7B.4** (was 7.4) States: show Sent/Nudged timestamps (Asia/Singapore), Paid badge, `paidDifferent` info (paid amount vs expected).
- **7B.5** (was 7.5) Entry from Home rows (wire the Home row actions, 5.3) and notification taps (Phase 9B).
- **7B.6** (was 6C.3) `Share` sheet (3 boards: `pdf`, `summary`, `system`): Radio PDF vs Summary, Switch options, Share button -> `expo-sharing`/`Share.share` system sheet with the stored PDF (cache file, from the Phase 6 bill file endpoint) or summary text. Reached only from Recipient's Share bill button.

---

## Phase 8: Household, Confirmations and the shared schemas package

Source `Household.dc.html` (largest file, 48KB; read in full) and `Confirm.dc.html`.

- ✅ **8.0** (was 12.5e) **Shared schemas package. Done early as Phase 3.5 (2026-10-24), before Phase 4; this text is kept for reference.** Original description: replace the hand-mirrored zod schemas in `app/src/lib/schemas/` (and the hand-synced `app/src/lib/api-types.ts`) with one shared package that both `backend/` and `app/` import, so the two sides cannot drift. Household has the largest zod config (1.2), so doing it first avoids mirroring that schema by hand and migrating it later. Start with a short spike: npm workspaces with a `shared/` package that depends only on `zod`, then confirm the backend build and Vercel (root directory), the Expo/Metro bundle and EAS builds all resolve it. Form-only schemas stay app-side, built from the shared pieces. **Candidate: `app/src/lib/month.ts`** (added in 2.11): pure month-key helpers on `date-fns` and `@date-fns/tz`. The backend has its own `backend/src/lib/month.ts` (Intl-based `monthKeyOf`/`currentMonth`), so move the shared logic into the package so both sides use one implementation and cannot drift on the Singapore month; the backend's `DEV_NOW` clock stays backend-side. This reverses the 1.8 and 1.11 "do not add a shared package in v1" decision (Francis, 2026-10-21).
- **8.1** (was 4B.1) Backend: `GET /api/household` (current version, upcoming version if any, people, per-version history), `POST /api/household/preview` (config draft + starts-from -> per-person amounts via split engine; this is what the edit preview card shows; **the app never calculates**), `POST /api/household/versions` (validates: starts-from must be after current month, except first version; shares add to 100%/totals; creates a new immutable version), `POST /api/people` / person updates go through versions (name and WhatsApp live on `Person`; everything else in config), `DELETE` of a person = a new version excluding them (never hard-delete), plus `removeVersion` for a not-yet-started future version only. The first version's config includes the default message templates from the Brief.
- **8.2** (was 4B.2) `view` overview: Cards for each person (route chip Directly/Via someone, rent, shares), landlord rent summary, 50/50 split bars (custom two-segment Progress), version/"starts from" badges, Add person button. `loading` skeleton.
- **8.3** (was 4B.3) Edit screens/sheets by state: `editPerson` (Tenant 2 from Jan 2027 with preview), `editPrimary` (rename, rename applies immediately on Person), `editTenant1` (ConnectedButtonGroup Directly/Via someone per charge type, Applies-to Select), `editHome` (landlord rent from Jan 2027), `addPerson` (empty form, ConnectedButtonGroup for the payment route, PhoneField starting with +65), `splitError` (shares not adding to 100% -> danger Alert + disabled Save).
- **8.4** (was 4B.4) "Starts from" MonthSelectField lists only months after the current month (first setup: current month allowed). Live preview via debounced call to `/api/household/preview`; show Spinner in the preview card while fetching. **First-setup mode:** the editors take a first-setup flag from the route, so the first version may start at the go-live month (Nov 2026), the only allowed exception. First run (Phase 10) launches the editors in this mode.
- **8.5** (was 4B.5 and 10B) **Confirmations** (`Confirm.dc.html`): `removePerson`, `removeVersion`, `discard` (back/close with a dirty form). Wire to Household and, later, to every dirty sheet. Filled Cancel, red-outline action, on the Phase 2 `ConfirmDialog`.
- **8.6** (was 4B.6) Required markers and label-above on every field; verify against FormControls.

Exit: a household can be created from scratch and edited; a version cannot start in the current/past month (API test + UI disables). The Household request and response schemas go in `shared/src/api/household.ts` from the start (the package itself exists since Phase 3.5).

---

## Phase 9: Settings and Notifications

### 9A. Settings (5 states)
Source `Settings.dc.html` (33KB).
- **9A.1** (was 10A.1) Backend: `GET/PUT /api/settings` (notification toggles per channel/type); message templates are part of the versioned household config, so template edits go through `POST /api/household/versions` (8.1) with "starts from" (Settings "Applies to" Select: everyone / a person).
- **9A.2** (was 10A.2) `view`: Account Card (signed-in email, Sign out, no confirmation dialog per mapping), Appearance (ConnectedButtonGroup Light/Dark/System bound to the existing `useThemePreference()` from step 2.1a; no new theme logic), Messages (links to template editors), Notifications (Switches per channel/type; they do nothing until 9B lands).
- **9A.3** (was 10A.3) `template` / `override` / `nudge`: Textarea editors (label above), placeholder chips to insert, preview card with compact ConnectedButtonGroup sample selector (custom), per-person override via Applies-to Select; Save creates a version (starts-from rule applies).
- **9A.4** (was 10A.4) `blocked`: when notification permission is denied, warning Alert + "Open system settings" (`Linking.openSettings()`, external-link icon); re-check on app foreground.
- **9A.5** (was 10A.5) Sign out: `authClient.signOut()`, clear query cache, `GoogleSignin.signOut()`, cancel scheduled notifications (9B).

### 9B. Notifications ("Notifications" boards are a copy reference, not screens)
Source `Notifications.dc.html` (`headsUp`, `shade`) for copy, channel names, action labels, small icon. Tech Stack table defines triggers.

- **9B.1** (was 11.1) `expo-notifications` channels: Action needed (high, heads-up), Payment checks, FYI (low/silent); create on launch.
- **9B.2** (was 11.2) Action buttons: Paid -> opens Record payment sheet via deep link `splithouse://payments/new?charge=<id>`; Nudge -> opens WhatsApp nudge via Recipient with nudge intent (needs foreground). Register categories with `setNotificationCategoryAsync`.
- **9B.3** (was 11.3) Scheduler `app/src/lib/notifications/schedule.ts`: input = month summary + settings; cancels all and reschedules (idempotent) on sign-in, launch, and after every mutation (new bill, payment, due-date edit, setting toggle). Date-based: upload bill (about the 2nd, daily until done), collect Tenant 1's rent (last working day before the 1st), Pay utilities bill with live "collected $X of $Y", per-charge "Did {name} pay {charge}?". Event-based immediate: Transfer $950 to savings (when Tenant 2 rent marked received), month settled, unusual bill, aircon due.
- **9B.4** (was 11.4) Backend `GET /api/notifications/plan` returns computed trigger list so scheduling logic stays server-side/testable (preferred, mirrors "split engine only in backend"); app only schedules.
- **9B.5** (was 11.5) Tap routing with `expo-router` + `Notifications.useLastNotificationResponse`.
- **9B.6** (was 11.6) Test on device overnight for delivery delay (Tech Stack "Reminder delay"), no exact-alarm permission.

---

## Phase 10: First run ("Welcome", 3 states)

A launcher over screens built earlier (Household editors, Confirmations, Settings), so it comes after them. The empty-database path is tested by clearing the dev DB with the `seed:reset` wipe, so no extra seed scenario is needed.

- **10.1** (was 4A.1) `Welcome` `state=empty`, `progress`, `notifications`: Card with 4-segment step indicator (custom Progress), "2 of 4 steps done", rows: household/people, rent & shares, recurring charges, reminders (optional). Row detail copy from source.
- **10.2** (was 4A.2) Each step opens the matching Household editor (Phase 8) in first-setup mode (8.4).
- **10.3** (was 4A.3) **Reminders step**: explainer then `Notifications.requestPermissionsAsync()`; on grant mark step done; on denial show the blocked state (9A.4) and continue (optional step). Android 13+ runtime permission.
- **10.4** (was 4A.4) Backend: `GET /api/setup/progress`, derived from household version + settings; `POST /api/setup/complete` not needed (derived). Home is reachable once steps 1-3 are done.

Exit: from an empty dev database, First run takes a household from nothing to Home.

---

## Phase 11: Add charge (5 states)

Source `AddCharge.dc.html`. Last of the feature screens because it is a nice to have: a wrong bill is rare, and a correction charge is its only must-have use (6B.6).

- **11.1** (was 9A.1) Backend: `POST /api/charges/preview` (mode, split method, total, who, custom amounts, month) -> per-person cents via engine; `POST /api/charges` creates `ChargeGroup` + charges in one transaction (amounts stored, never recalculated). `Correction` = personal charge with `correctsMonth`, signed amount.
- **11.2** (was 9A.2) UI sheet: ConnectedButtonGroup Shared / Personal (Add charge is not final), single-select chips for split method (Per share, Per unit, Custom) and Who, Label, Amount (MoneyField), Month being fixed (MonthSelect, corrections), Due date, Note. Live preview card from the preview endpoint (debounced, Spinner while loading); `error` state (custom split doesn't add up) = danger Alert + Save disabled; Saving/Failed via scaffold. Replaces spike `add-charge-sheet.tsx`. Switch on the Home Add charge entry (5.4) and the History link to correction charges (4.2).

---

## Phase 12: Hardening and release

- **12.1** Dark-mode sweep of all 18 components x all states via `__gallery`; hex grep; touch targets; font weights.
- **12.2** Layout nudges the design warned about: taller label-above forms (MarkPaid different amount, failed sheets), Settings `blocked`; keyboard-avoiding in sheets; small phone and large font scale.
- **12.3** Accessibility: labels on icon buttons, contrast of tokens already designed, focus order.
- **12.4** Public-repo hygiene scan: no real names/numbers/amounts in code, tests, seed, README; `.env.example` names only; no `assets-old` content. Also none of the `TODO: replace with a wrapper` lint disables left in `app/src` (see 2.18), and `no-restricted-imports` clean without disables except justified ones.
- **12.4a** **Unused code sweep**: `isMonthKey` in `app/src/lib/month.ts` (added in 2.11) had no caller outside its tests. If still unused, delete it and its tests. Also list the other exports under `app/src/lib/` that nothing imports, and remove or justify each.
- **12.5a** **Backup bucket account setup (Francis, by hand; add as a new section to `docs/SplitHouse — Account Setup Guide.md`)**: create a free Cloudflare account and enable R2 (**decided: Cloudflare R2**; chosen over Backblaze B2 for free egress so restores cost nothing, a 10 GB free tier that includes 1M writes and 10M reads a month, and S3-compatible tooling; B2 is the fallback). R2 enabling goes through a checkout flow for an R2 subscription; the docs do not say whether a card is required, so check at signup and confirm Francis is fine with that. Create a private bucket named `split-house-backups` (no public access, no custom domain). Create an API token scoped to that single bucket with write/read only (no account-wide key, no delete rights if the provider allows). Note the endpoint URL, access key ID and secret in a password manager. Set a lifecycle rule to expire objects after about 60 days (or the job prunes to the last 8).
- **12.5b** **GitHub secrets (Francis, in the repo's Settings > Secrets and variables > Actions)**: `NEON_DIRECT_URL` (direct, not pooled, read-only role if Neon allows), `BACKUP_PASSPHRASE` (also saved in the password manager; without it backups can't be restored), `BACKUP_BUCKET`, `BACKUP_ENDPOINT`, `BACKUP_ACCESS_KEY_ID`, `BACKUP_SECRET_ACCESS_KEY`. Add the names (no values) to `.env.example` or the setup guide.
- **12.5c** **Workflow** `.github/workflows/backup.yml`: weekly cron plus manual `workflow_dispatch`; steps: install the Postgres client matching Neon's major version, `pg_dump --format=custom`, encrypt with `age`/`gpg` using the passphrase, upload to the bucket with an S3-compatible CLI, prune older than the last 8, fail the job (GitHub emails Francis) on any error. No dump or secret is ever printed to logs or kept as a public artifact.
- **12.5d** **Restore test, once before go-live**: download the latest object, decrypt, `pg_restore` into a scratch Neon branch, check row counts for `Charge`, `Bill`, `BillFile` and that a bill PDF opens; delete the scratch branch. Write the restore steps in `backend/README.md` (no secrets).
- **12.5e** Moved to 8.0, then done early as Phase 3.5 (shared package).
- **12.6** Production: Vercel project `split-house-api`, env vars, Neon prod branch migration (`prisma migrate deploy`), seed *real* household through the app's First run (not through code), EAS production-profile APK, new-phone test (install, sign in, old session revoked, reminders rebuilt).
- **12.7** Go-live check for the Nov 2026 cycle: end-to-end dry run on the dev branch with fixtures: set up household, open month, upload (test) bill, preview messages, WhatsApp open, record payments, corrections, settle.

---

## Critical files

- `docs/DESIGN.md`, `docs/design/source/*.dc.html`, `docs/design/config.ts`, `docs/design/global.css`
- Existing to extend: `app/src/app/_layout.tsx`, `app/src/components/bottom-nav.tsx`, `connected-button-group.tsx`, `chip.tsx`, `app/src/components/ui/*`, `app/src/lib/auth-client.ts`, `app/src/screens/home/*`, `app/src/screens/sign-in/*`
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
