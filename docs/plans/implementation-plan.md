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
3. Build the screen under `app/src/screens/<name>/`, a route in `app/src/app/`, token classes only (no hex; grep before review: `#[0-9a-fA-F]{3,8}` in `app/src` excluding `config.ts`). The route file stays a thin wrapper that renders the screen, and the screen's root is the shared `Screen` component (2.13a), so the background and the top safe-area inset come from one place and are never re-added per screen. **Keyboard rule (Francis, 2026-10-29):** any screen with a text or number input, or any other keyboard interaction, wraps its scroll area in `<KeyboardAvoidingView behavior="padding" className="flex-1">` (from `react-native`), as the component test page and Bill upload do. Edge-to-edge Android does not resize for the keyboard, so without it the focused field is hidden behind it. The footer buttons may stay under the keyboard while it is open. Sheets use the bottom sheet's own keyboard handling (`BottomSheetTextInput`) instead.
4. Implement every state in the DESIGN.md table for that screen: loading skeleton, saving, failed (sheet stays open, input kept, Retry), empty, error.
5. Wire to the real API when its backend phase is done. Until then, the screen takes props from a typed fixture file under `app/src/fixtures/` (fictional names Priya/Sam/Jordan, Nov 2026 cents) and is reachable from a dev-only `__gallery` route that lists every screen x state x theme.
6. Verify: VS Code diagnostics on each changed file for type errors (the full `npx tsc --noEmit` runs at the end of the phase, ignoring the known errors inside `components/ui/*`), `npm run lint`, then on device in light and dark, and compare to the source markup (and a canvas screenshot from Francis where the markup is ambiguous). Check 44px touch targets, label-above FormControl, Lucide icons only, Manrope weights, and that with the keyboard open every input on a screen stays visible (the keyboard rule in step 3).
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
- ✅ **1.5** **API conventions** (`backend/src/lib/api.ts`; stays on Next.js route handlers as decided; route files are thin wrappers of about 10 lines; **superseded for new code (2026-10-24, Phase 4): database reads live in `backend/src/services/`, `backend/src/lib/` stays pure, no repository layer**): `requireSession()` using `auth.api.getSession`, 401 JSON on none; zod request validation; error shape `{ error: { code, message } }`; Asia/Singapore `currentMonth()`; all route handlers `dynamic = 'force-dynamic'`. Health route `GET /api/health` (used by the app to detect cold start / unreachable).
- ✅ **1.6** **Lazy month open** (`openMonthIfNeeded()`): on first request on/after the 1st, create `Month`, pin current `HouseholdVersion`, create rent and recurring charges in one transaction; idempotent.
- ✅ **1.7** **Endpoints (v1 contract)** written as each screen needs them, listed per phase below. Keep the list in `backend/README.md`.
- ✅ **1.8** **Typed client**: shared TS types for responses. Simplest: `app/src/lib/api-types.ts` hand-synced from backend zod schemas (monorepo has no shared package for now; a shared schemas package is required before go-live, see 8.0). **Superseded by Phase 3.5 (2026-10-24): response types now live in `shared/src/api/` and `api-types.ts` only holds the Phase 5 placeholder.**. `app/src/lib/api.ts` fetch wrapper adding the Better Auth session token (from `authClient`), 20s timeout, maps network failure/timeout/5xx-cold-start to a `ServerUnreachableError`.
- ✅ **1.9** **Data hooks**: add TanStack Query (check current docs) in `app/`: `QueryClientProvider`, `useMonthSummary` (placeholder, replaced by `useHome` in Phase 5.1), etc. Mutations invalidate affected keys. Retry policy: auto-retry reads twice with backoff (covers Neon cold start) before surfacing the blocking prompt.
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
| 6 | Bill upload, View bill, Mark bill paid (reorganized 2026-10-28) | 6, without Share |
| 7 | Payments (7A), then Recipient and Share (7B) | 8, 7 and 6C.3 |
| 8 | Household, Confirmations | 4B and 10B (the shared package was done earlier as Phase 3.5) |
| 9 | Settings (9A), Notifications (9B) | 10A and 11 |
| 10 | First run | 4A |
| 11 | Add charge | 9A |
| 12 | Hardening and release | 12, without 12.5e |

Old step IDs map to new ones as follows. Older entries in `docs/plans/implementation-plan_progress.md` use the old numbers.
- 9B.1 to 9B.3 are now 4.1 to 4.3. Phase 5 steps keep their IDs. Phase 6 was renumbered on 2026-10-28: 6A.1 is now 6.1 and 6.2, 6A.2 is 6.3, 6A.3 is 6.2 and 6.4, 6A.4 is 6.2, 6B.1 to 6B.3 are 6.2, 6B.4 is 6.3 and 6.4, 6B.5 is 6.5, 6B.6 is in the Phase 6 intro (Replace bill is out of v1), 6C.1 is 6.6 and 6.7, 6C.2 is 6.8, and 6C.3 is now 7B.6.
- 8.1 to 8.5 are now 7A.1 to 7A.5. 7.1 to 7.5 are now 7B.1 to 7B.5.
- 4B.1 to 4B.6 are now 8.1 to 8.6 (10B is folded into 8.5). 12.5e is now 8.0.
- 10A.1 to 10A.5 are now 9A.1 to 9A.5. 11.1 to 11.6 are now 9B.1 to 9B.6.
- 4A.1 to 4A.4 are now 10.1 to 10.4. 9A.1 and 9A.2 are now 11.1 and 11.2.

---

## ✅ Phase 4: History (4 states)

Source `History.dc.html`. Built first as a quick win: it is read-only and the Aug to Oct 2026 seed covers it, so it proves the whole path (endpoint, query hook, skeleton, both themes, on device) before Home.

- ✅ **4.1** (was 9B.1) Backend: `GET /api/history` (months list: bill total, paid count, chips), `GET /api/history/:month` (charges with paid state, corrections, banner flags). Derived, no new tables.
- ✅ **4.2** (was 9B.2) States: `list`, `loading`, `monthCorrected` (info Alert "corrected later" linking to the correction charges). Here it renders from the seeded Sep correction; the link to the correction charge stays a stub until Add charge (Phase 11). `monthCarried` is **deferred to a future fix**: a month with an unpaid charge just shows the normal Unpaid chip on that row, with no carry banner or "carried to Jan" copy.
- ✅ **4.3** (was 9B.3) Read-only except opening a charge. Read `History.dc.html` for what opening a charge opens; if the source doesn't show it, stop and ask. Until that target exists, the row does nothing.
- ✅ **4.4** Check against the seed: Aug (fully paid), Sep (corrected later), Oct (one charge short-paid, one unpaid).

---

## ✅ Phase 5: Home ("Main", 7 states), one step per state

Source `Main.dc.html` (40KB). Replaces spike `screens/home`. Reorganized 2026-10-25: one step per Home state, each building on the last. 5.1 builds the base (contract, services, libs, route, UI); every later step adds its state on top. Home renders from the database: no state needs a flow (bill upload, payments) to be reached.

Home is a backend-for-frontend (as Phase 4): `GET /api/home` returns display-ready text, tones and navigation targets, and the app renders and navigates. The server picks the month, so there is no month parameter and the client's time zone never matters. Layers: route -> `services/home/` (reads) -> pure builders in `lib/home/` (take `today`, no clock). Contract in `shared/src/api/home.ts`. A screen that needs the same facts later calls the same services and libs from its own endpoint; it does not read `/api/home`. Plan text elsewhere that says "month summary" (1.9, 7A.5) means this query.

**Decisions (Francis, 2026-10-25)**
- **Months can start early.** Paydays differ, so billing for a month often starts a few days before the 1st. Home shows the newest opened month. A month opens automatically on the first request on or after the 1st (even if last month is unsettled; its unpaid charges stay in History as "N unpaid"), or by a "Start next month" button once the current month is settled, any day (5.7). Both use `openMonthIfNeeded`, which takes a month.
- **No savings special case.** Home only tracks whether each person has paid. "You're fronting" = non-owner charges other than utilities, minus what has been paid; it is $0.00 when settled. Utilities show separately as bill coverage. The "goes to savings" and "moved to savings" copy is dropped.
- **Bill due day in the household config:** `categories.utilities.billDueDay` (optional, 1 to 31; additive, so `HOUSEHOLD_SCHEMA_VERSION` stays 1). The due date of an uploaded bill supersedes it.
- **One row per charge, type first** (`Rent · Jordan`, with the design's `·` separator), with the due-day column, ordered by due date. Replaces the design's grouped rows. Detail lines, badges and layout follow the design boards (`Sent 2 Nov`, `Nudged 2 Nov`, `Paid 3 Nov`), minus the savings text. Dates show as day and month, with no weekday, everywhere on Home (rows and hero date line). Sam's utilities (paid via Priya, no due day of his own) use Priya's due day for now; separate due dates per person come later.
- **Dropped from Home:** the aircon-due and unusual-bill alerts (not in `Main.dc.html`; FYI notifications in Phase 9B) with the `aircon-due` scenario, and the header month chevron (Home never switches months; History does).
- **Seed scenarios** live in the steps, not up front. Run from `backend/`: `npx prisma db seed -- --scenario <name>`. The seed reads the flag with `parseArgs` from `node:util`; 5.1 confirms the flag reaches the script. Each scenario prints the `DEV_NOW` to use. The `upload` scenario does not create November, so Home's first request on 1 Nov opens it through `openMonthIfNeeded`.

**Rules for every step**
- Each step ends with Francis's review on device (light and dark) after reseeding its scenario.
- Every action the design shows is rendered, so Home can be checked against the data. Actions that open screens not built yet (Recipient and Mark paid, Phase 7; bill screens and Mark bill paid, Phase 6) are visible and do nothing until those phases land. Only Add charge stays hidden until Phase 11.
- Each step lists what it changes in earlier steps' code, as either a **refactor** of what exists (so the new state fits cleanly) or a **simple addition** on top.
- Tests: builder tests on fake rows from the Nov 2026 fixtures; a contract test that parses the real response with the shared schema (as `bootstrap.test.ts`); `deriveMonthStatus` gets one test per status it learns.
- Differences from the design go in `docs/plans/design-deviations.md`, Phase 5 section.

- ✅ **5.1** `upload` + `loading` (the base). `DEV_NOW=2026-11-01T09:00:00+08:00`.
  - Seed: `--scenario` handling in `seed.ts`; `upload` is the default (Aug to Oct as today, November not created, no bill, no draft).
  - Config: add `billDueDay`; update fixtures (Nov 16, Aug to Oct 25), seed and the Data Model doc.
  - Shared: `shared/src/api/home.ts` (status; hero with date line, steps, compact status and a body union; rows with day, title, amount, detail, badge, tint, expanded, note, actions, link; primary action; navigation targets as a union with only the ids needed). Reuse `badgeSchema`. Dates use the existing `formatDateShort` (`2 Nov`); add only a days-until helper to `shared/src/lib/date.ts`.
  - Backend: `lib/home/derive-month-status.ts`; `lib/home/build-home.ts` (hero, one row per charge by due date, chip rules, fronting, rows projected from the pinned household version for charges that do not exist yet, such as utilities, shown as "—" and "Needs bill"); `services/home/home.service.ts` (opens the calendar month if not open, then works on the newest opened month; reads it, its pinned config, its charges and whether a bill exists); `app/api/home/route.ts` (thin); README endpoint row.
  - App: `useHome` hook and query key (like `use-history.ts`) replacing the step 1.9 placeholder (`hooks/use-month-summary.ts`, `queryKeys.monthSummary`, `MonthSummaryResponse`); `screens/home/` rebuilt (components/, types.ts, main file, index.ts barrel): hero card with step bar and two tiles, `Charges` accordion rows, loading skeleton, footer "Upload utilities bill"; `(tabs)/index.tsx` stays a thin wrapper in `Screen`. Remove the spike `index.tsx` and `dev-bootstrap-check.tsx` (check nothing else imports them); keep `add-charge-sheet.tsx` for Phase 11.
  - Shown at 1 Nov, by due date: `Rent · Jordan` "Due today" (info tint, expanded); `Utilities · Jordan` (4th); `Rent · Priya`, `Starhub · Priya`, `Utilities · Priya` (7th); `Utilities · Sam` (via Priya); the bill row (config day 16, "Not uploaded"); `Rent · Sam` (28th, "Upcoming"). Projected utilities rows show "—" and "Needs bill". Hero "Waiting on the utilities bill", fronting tile, "No bill yet" tile.
  - Deviations to log: fronting, no savings copy, no month chevron, one row per charge with type-first titles, "Due today" instead of the board's "Overdue 1 day".
- ✅ **5.2** `draft`. `DEV_NOW` as 5.1.
  - Seed scenario `draft`: a `BillDraft` row with synthetic parsed fields and the placeholder PDF.
  - Backend: the service checks for a draft without loading its bytes; `deriveMonthStatus` returns `draft`; the bill row gains a `notice` (title, text, Continue and Discard draft actions). Still step 1 of 3; the footer button stays.
  - App: the info Alert with two buttons above the bill row.
  - Changes to 5.1: simple addition (row schema gains `notice`). Continue and Discard draft do nothing until Phase 6.
- ✅ **5.3** `unsent`. `DEV_NOW` as 5.1.
  - Seed scenario `unsent`: `Bill` (with file) saved and utilities charges built with `buildUtilitiesCharges`; no `MessageEvent`.
  - Backend: reads the bill's amount and due date and the month's `MessageEvent`s. Status is `unsent` while any payer who owes something has no MONTHLY event ("N messages ready" counts payers, so Sam's utilities ride in Priya's message). The real bill due date supersedes `billDueDay`.
  - UI: hero "Bill's in. Send the breakdowns" with the bill tile, step bar at step 2, real amounts, "Not sent" badge and "Review message" link, no footer button (design), bill row note "Nothing collected yet. Shares go out with the messages."
  - Changes to 5.1: refactor (the footer depends on status; projected rows are limited to `bill_missing` and `draft`); simple additions (real amounts instead of "—", a hero body variant).
- ✅ **5.4** `collecting`. `DEV_NOW=2026-11-03T09:00:00+08:00`.
  - Seed scenario `collecting`: monthly messages opened, Jordan's rent nudged, a partial payment so coverage is partial.
  - Backend: reads paid fields; hero collecting body (fronting with "back so far"; bill coverage = Francis's own utilities share + paid utilities charges; progress); full chip precedence (Paid, Overdue N days, Due today, Due tomorrow, Due in N days, Sent unpaid, Upcoming); the `Nudged` detail line; warning tint for overdue; Nudge, Nudge again and Mark paid row actions; footer "Record payment". Decide at this step: the "Due in N days" window (the design's boards disagree; proposed N ≤ 3).
  - Changes to earlier steps: refactor (the 5.1 chip rules become the full precedence list); simple additions (more `tint` values, fronting moves, compact summary text).
- ✅ **5.5** `dueToday`. `DEV_NOW=2026-11-04T09:00:00+08:00`.
  - Seed scenario `dueToday`: as `collecting`, Jordan's rent paid, Jordan's utilities due on the 4th.
  - Hero info Alert "Jordan's utilities are due today" with the amount, info tint on that row, the "payment check tonight" note. Mostly additive over 5.4.
- ✅ **5.6** `settled`. `DEV_NOW=2026-11-29T09:00:00+08:00`.
  - Seed scenario `settled`: everything paid, bill marked paid.
  - Hero settled body (check, "November is settled", two tiles), step bar all done, rows Paid with "Paid d Mmm", date line "29 Nov · Done", no footer, footnote without the savings sentence. Settled means every non-owner charge is paid and the bill is paid.
- ✅ **5.7** Start the next month early. Uses the 5.6 `settled` scenario, `DEV_NOW=2026-11-29T09:00:00+08:00`.
  - **Design (received 2026-10-26, `docs/design/source/Main.dc.html`, `state=settled`):** a solid full-width primary "Start next month" button (48px, fully rounded, calendar-plus icon on the left) in the bottom action bar above the navigation, settled state only. The label is fixed, not the month's name. It opens the `CloseMonth` confirm dialog (blocking AlertDialog: "Close November?", Cancel solid primary, Confirm destructive outline). While closing, Confirm shows a spinner, Cancel is disabled and the dialog cannot be dismissed. Confirm leads to Home for the next month in the Bill not uploaded state (`Main` with `month=dec`). Decided with Francis (2026-10-26): no undo in v1; after Confirm Home shows the newest opened month (current + 1) as if it were the 1st; a failed close is not drawn, so it is decided at build (the dialog returns to idle and shows the existing error Alert; the "Can't reach the server" prompt still handles a network failure). Scrims must sit above Home's footer and navigation (z-index fix from the handoff, also in `ServerError`). Starting while unsettled is not offered, which matches the 409 rule. The Data Model doc now says a settled month can open the next one early. Household edits must start after the newest opened month, so after an early December start the earliest edit month is January (the Household edit rule and its validation read the newest opened month, not the calendar month).
  - Seed: no new scenario. The 5.6 `settled` scenario (November fully settled, December not opened) is the review scenario, so the dialog reads "Close November?" as in the design. Reseed `settled` to review again, since confirming opens December.
  - Backend: `POST /api/home/start-next-month` opens the month after the newest opened one through `openMonthIfNeeded`; 409 unless the newest month is settled, or if the next month is already open. `GET /api/home` gains `nextMonthAction: { label, dialog } | null` (the label is the constant "Start next month"; `dialog` holds the display text for the Close dialog, built from the month being closed and the next, since the backend writes display text; only when the newest month is settled, the next is not open and a household version covers it). A service decides the newest opened month and Home reads it instead of the calendar month.
  - History: "past month" means before the newest opened month, not before the calendar month (list, month detail 404 rule and unpaid counts in `services/history/`).
  - App: the button and the Close dialog with its closing state from the design above (the settled state gains a bottom action bar, and the navigation loses its own shadow there; the dialog's month names come from the response, not hard-coded), calling the endpoint and refetching Home and History.
  - Changes to earlier steps: simple addition (settled hero gains the button); refactor (`bootstrap.currentMonth`, History's services and anything else that treats the calendar month as "current" switch to the newest opened month).
- ✅ **5.8** Home pass. Walk every state in order by reseeding each scenario, light and dark, on device; hex grep and 44px targets; `deriveMonthStatus` table test covers all five statuses; remove dead code left by earlier steps (for example unused projection branches); full type check, lint and tests in `app`, `backend` and `shared`; deviations list complete.

Exit: each seeded scenario renders its design state on device, starting the next month works from Home, and Home needs no flow to be reached.

---

## ✅ Phase 6: Bill upload, View bill, Mark bill paid

Sources `BillUpload.dc.html` (13 steps), `Bill.dc.html` (`collecting`, `paid`, `loading`) and `PayBill.dc.html` (`collected` partial or full, `save` idle, saving, failed). Reorganized 2026-10-28 the way Phases 4 and 5 were. Upload comes first: the parser is the riskiest piece, and a saved bill is what View bill and Mark bill paid are about. Each step is one group of states, building on the last. 6.2 builds the base for upload; 6.6 builds the base for the bill screens and is reviewed on the seeded months and on the bill saved in 6.2. Replace bill stays out of v1 (a wrong bill is fixed with a correction charge, Phase 11): Bill upload is offered only when the month has no saved bill, and saving returns 409 if one exists.

Both bill screens are backends-for-frontend, as Home and History are: the API returns display-ready text, tones and badges, and the app renders and navigates. The month is in the path (`/api/months/:month/...`) because Home's targets (`bill-view`, `mark-bill-paid`, `bill-upload`, `bill-draft-continue`, `bill-draft-discard`) already carry it. Layers: route -> `services/bill/` (reads and writes) -> pure code in `lib/bill/`. Contracts: `shared/src/api/bill-draft.ts` and `shared/src/api/bill.ts`. A screen that needs the same facts as Home (collected so far) calls the same lib, not `/api/home`.

**Rules for every step**
- Each step ends with Francis's review on device (light and dark) after reseeding its scenario: `npx prisma db seed -- --scenario <name>` from `backend/`.
- Every action the design shows is rendered. Actions to screens not built yet (Recipient, Phase 7, or a later Phase 6 step) are visible and do nothing.
- Each step lists what it changes in earlier steps' code, as a **refactor** or a **simple addition**.
- Tests: pure builders on fake rows from the Nov 2026 fixtures; a contract test that parses the real response with the shared schema; route tests for every 4xx a step adds.
- Dates show as day and month with no weekday (`16 Nov 2026`), as on Home and History.
- Differences from the design go in `docs/plans/design-deviations.md`, Phase 6 section.
- **The real bill in `assets-old/` is used only locally, only against the parser (6.1) and in the go-live dry run (12.7).** Never print its values, copy it, or upload it to the dev database. Device testing uses a synthetic PDF. Tests and fixtures use invented values.

- ✅ **6.1** Parser (backend only, no UI). Isolated, so it is built and tested before any upload UI depends on it.
  - `lib/bill/bill-parser.ts`: provider-neutral `BillParser` (text in, `ParsedBill | null` out). `lib/bill/util-bill-parser.ts`: `UtilBillParser` (SP Group's combined utilities bill; named for the provider, not the local "PUB" nickname). Output: provider, `currentChargesCents` (required; lines without Current Charges count as a failed read), bill month, billing period, due date, best-effort lines as label and cents.
  - `services/bill/read-bill.service.ts`: bytes -> text with unpdf -> parser. unpdf only extracts text.
  - Fixture: a synthetic PDF that copies the real bill's labels and layout with invented values, generated by a script and committed, so tests run unpdf for real. It is also the PDF Francis puts on the phone for device testing, and the valid PDF the seed uses in 6.7. Francis checks the real bill locally with a throwaway uncommitted script that prints only which fields were found, never their values.
  - Changes to earlier steps: none.
- ✅ **6.2** Upload base: `pick`, `reading` (no board of its own: Review bill opens at once with a skeleton form, B8), `review` (a clean read), and save. `DEV_NOW=2026-11-01T09:00:00+08:00`, `upload` scenario; `uploadOct` (`DEV_NOW=2026-10-01T09:00:00+08:00`) for an October bill.
  - Shared: `shared/src/api/bill-draft.ts` (the draft, the save request and response).
  - Backend: `lib/bill/bill-file-store.ts` (storage interface `save`, `get`, `delete` over `BillFile`, built here before it is used); `POST /api/months/:month/bill-draft` (multipart; PDF magic bytes; `MAX_BILL_PDF_BYTES` = 4 MB, because Vercel rejects request bodies over 4.5 MB before the route runs; one draft per month, replacing the old one; lazy purge); `GET /api/months/:month/bill-draft`; `POST /api/months/:month/bill` (one transaction moves the draft into `Bill` and `BillFile`, creates the utilities charges with `buildUtilitiesCharges`, deletes the draft; 409 if the month has a bill; Current Charges required). Saving moves the month to `unsent` on Home. Check the current Vercel limit in the docs before fixing the constant.
  - App: add `expo-document-picker`, `expo-file-system` and `expo-intent-launcher` together (native modules: **needs a new EAS development build**, so ask Francis and commit first; one build covers 6.2 and 6.7; check the current Expo docs for the SDK 57 file API); route `bill/[month]/upload`; `screens/bill-upload/` (components/, types.ts, main file, index.ts barrel). `pick` (the three "What happens next" steps, Choose PDF), `reading` (a Spinner on the file card, since `fetch` gives no real upload progress; Cancel), `review` (file card with Choose another file, Current Charges, Bill month, Due date, Billing period, Utility lines with editable name and amount and a remove button, Save bill, Cancel). `apiFetch` already takes `formData`. The device checks PDF type and size before sending and shows the required error when Current Charges is empty; every other check is on the server (6.3).
  - Seed: the `draft` scenario's `parsedJson` becomes the parser's output shape.
  - Undrawn, so ask before building: what the user sees when the picked file is not a PDF or is over the limit.
  - Changes to earlier steps: refactor (the 5.2 seed draft); simple additions (`bill-upload` case in `open-target.ts`, Home refetch after save). After saving, Home's `View bill` link does nothing until 6.6.
- ✅ **6.3** Checks: `period`, `sum`, `partial`, `noLines`, `unusual`, `confirm`, `addLine`. The device checks required fields only; the server does every other check, sends back display-ready text, and checks again at save.
  - Stops Save (decided with Francis, 2026-10-29: the bill is the source of truth, and his real billing period runs from the 3rd to the 2nd of the next month, so the period is never compared to a calendar month): Bill month, Due date (Francis, 2026-10-30: a bill saved without one has no due date of its own and Home falls back to the config's `billDueDay`), Billing period and Current Charges are all required; the billing period must start in the month before the month the upload started from (a bill pays for the month before it: the November bill covers 3 Oct to 2 Nov; it is judged against the upload month, not the typed Bill month, so each error shows on its own), must not end before it starts, and must end at most 30 days after it starts (counted as the days between the first and last day, so a 3rd to 2nd period passes in every month, February included; Francis, 2026-10-29); the Bill month does not match the month the upload started from (the `period` board adapted: red Bill month field only, danger Alert "Did you attach the wrong bill?" naming both months and saying to edit the Bill month if it was misread, disabled Save bill with "Fix the bill month or choose another file to save"); Current Charges is not an amount above zero. Warns but allows Save, listed in the "Save with warnings?" dialog: the lines don't add up to the bill's Subtotal, the charges before GST (`sum`; Francis, 2026-10-29: the real bill's lines never add up to Current Charges because of GST, so GST is neither read nor compared); a line has no amount (`partial`); Current Charges is unusually far from recent bills (`unusual`).
  - Backend: `lib/bill/check-bill.ts` (pure, table-tested); `lib/bill/unusual-bill.ts` (pure: Current Charges against the average of the last saved bills; the service reads the last 3 saved bills before the month, and the seeded Aug to Oct bills are enough to test it; no warning when there is no history); `POST /api/months/:month/bill-draft/check`. No Current Charges helper text ("Split into 5 shares of $82.46…") is built or returned (Francis, 2026-10-29). Save runs the same checks again and returns 422 on a blocker. The billing period is not matched to the month; how the bill month is read from the PDF is confirmed here from the real bill's pattern, with no values printed.
  - Parser (added to 6.1's `util-bill-parser.ts`, 2026-10-29): the lines are Electricity, Gas, Water and Refuse Removal. Refuse Removal and the Subtotal are read from the second page's breakdown table (a line that starts with the label and ends in its total, no `$`); the services are still read from the first page's summary. Still plain `unpdf` text, no positions and no AI. The Subtotal comes back with the read fields as `subtotalCents`, shows as a read-only row under the lines, is not an editable line, is not added to the sum and is not saved. The synthetic fixture is now two pages mirroring the real bill's layout.
  - Confirm (`confirm`, built 2026-10-30): tapping Save asks the server for a check of exactly the current values (the one on screen can be a typing pause behind), and if the response's `warnings` list is not empty, opens the AlertDialog "Save with warnings?" (the shared `ConfirmDialog`: warning icon, "Check these before you continue:", one bullet per warning, "Go back and fix" filled, "Save anyway" neutral outline, a spinner on Save anyway while saving, a failed save shown in the dialog). No warnings means Save goes straight through. A blocker in that fresh check does nothing (the Alert shows once the check on screen catches up, and the server would refuse the save); an unreachable server shows the app's own prompt; any other failure of the check does not stop the save. `warnings` is built by the server: the lines note's title first, then the unusual-bill line. The bullets use our wording ("2 lines not found", "Lines don’t add up to the Subtotal"), not the board's "2 utility lines not found" and "…to Current Charges".
  - Unusual (`unusual`, built 2026-10-30, wording and threshold agreed with Francis): `lib/bill/unusual-bill.ts` and the check service (now takes the db, reads the last 3 saved bills before the month, and skips the read without an amount). The check response gets `warnings: string[]`, the dialog lines, holding "This bill is X% higher/lower than your recent bills." when Current Charges is more than 25% above or below the average (exactly 25% is fine; fewer than 3 bills use what exists; none with no history). The app shows nothing for it until the dialog (`confirm`) lists it, per B11; that check also adds the lines warnings to the dialog.
  - Partial (`partial`, built 2026-10-30): a service whose heading is on the bill but whose amount could not be read comes back as a line with no amount (the read stops at the next block, so it never takes the next service's amount). The server's `linesNote` reads "N lines not found: Fill them in or leave them empty. You can still save; the split uses Current Charges." while any line has no amount, and the sum is only compared once every line has one. A line that started with no amount shows the dashed orange Add in place of its amount field and "Not found on the bill" under the row until an amount is filled in; Add reveals the field and focuses it. `npm run generate:bill-fixture` also writes `bill-partial.pdf` (no Water amount) for the device.
  - App: debounced check call after typing pauses; the period Alert and red fields; the lines warning (shown only when they don't add up to the Subtotal); the "N lines not found" note; the "No lines found" box whenever there are no lines; Add line appends an inline row with the name focused (the `addLine` board, not a sheet); `confirm` = AlertDialog "Save with warnings?" (Go back and fix filled, Save anyway neutral outline).
  - Undrawn, so ask before building: the wording of the unusual-bill line in the dialog, and the threshold (proposed: more than 25% above or below the average of the last 3 saved bills; the docs define neither "unusual" nor "recent").
  - Changes to earlier steps: simple additions (the check result on the draft response; the footer depends on whether Save is allowed).
- ✅ **6.4** `discard` and the Home draft. `draft` scenario, `DEV_NOW=2026-11-01T09:00:00+08:00`.
  - Backend: `POST /api/months/:month/bill-draft/discard`.
  - App: `discard` = AlertDialog "Discard this bill?" (Keep editing filled, Discard red outline), from Back and Cancel on `review` and when the form is dirty. Home's Continue (`bill-draft-continue`) opens review with the stored draft (the parsed values; edits are not stored); Discard draft (`bill-draft-discard`) deletes it; both refetch Home. Cancel during `reading` aborts the request and discards a stored draft.
  - Changes to earlier steps: simple additions (two `open-target.ts` cases, Home refetch). Resolves Q5 in `design-deviations.md` (`GET bill-draft` exists from 6.2).
- ✅ **6.5** Unreadable bill: `readingFail`, `failed`, `unread`. `readingFail` is the `reading` board whose next screen is `failed`, not a state of its own.
  - Backend: when the parser returns nothing, the draft is still stored, with `parseOk` false, so "Is this the right bill?" survives the app closing, and the response says so. Saving such a draft stores `NOT_PARSED` and keeps the file; "No, choose another file" discards it. A bill with no file (`MANUAL`) is deferred: no board has an entry point, so `MANUAL` stays in the enum and save accepts a draft only.
  - App: `failed` screen "Is this the right bill?" (danger Alert, file card, Yes and No; a screen of Card, Alert and Buttons, not an AlertDialog). Yes opens the empty review form with the info Alert "Typed, not read." and the normal numeric keyboard (the board's number pad only mocks Android's keyboard and is not built); No discards and returns to `pick`. Home's Continue on a draft with `parseOk` false goes to `failed`.
  - Changes to earlier steps: simple addition (read status on the draft).
- ✅ **6.6** View bill: `loading`, `collecting`, `paid`, plus `unsent`. Reviewed on seed data (`unsent` at `DEV_NOW=2026-11-01T09:00:00+08:00`, `collecting` at `2026-11-03T09:00:00+08:00`, `settled` for the paid state at `2026-11-29T09:00:00+08:00`) and on the bill saved in 6.2.
  - Shared: `shared/src/api/bill.ts`: header month name; hero card (Current Charges, badge, lines); collection card (title, note, percent, one row per person with name, shares, amount, badge); facts (Bill month, Billing period, Due date, and "You paid" when paid); file (`filename`, meta line) or null; footer action or null. Reuse `badgeSchema`.
  - Backend: `lib/bill/build-bill-view.ts` (pure, takes `today`); `lib/bill/bill-coverage.ts` (collected so far = Francis's own utilities share plus utilities charges paid, capped at the bill; **moved out of `lib/home/build-home.ts`** so Home and View bill read one function); chips follow Home's precedence, added to the central badge map in `lib/home/badges.ts`; `services/bill/bill-view.service.ts` (reads the bill without `BillFile.bytes`, the month's utilities charges, the pinned household version for share counts); `app/api/months/[month]/bill/route.ts` (thin, 404 `no_bill`); README endpoint row.
  - App: route `app/src/app/bill/[month].tsx` outside the tabs, like `history/[month]`; `useBill(month)` and `queryKeys.bill(month)`; `screens/bill/` (components/, types.ts, main file, index.ts barrel); skeleton from the `loading` board; the PDF row is drawn and Open does nothing until 6.7; the `bill-view` case in `open-target.ts`; History's `View bill` link (U4) drawn and wired.
  - Assumed, to log: `unsent` is not drawn. It uses the collecting layout with "Waiting" for everyone and no Mark bill paid button, matching Home (the bill row offers Mark bill paid only while collecting). The name for Francis is `You`, as drawn.
  - Changes to earlier steps: refactor (coverage out of `build-home.ts`, badge map gains bill badges); simple additions (History link, `open-target.ts` case, query key).
- ✅ **6.7** Open the PDF (View bill's Open row; external viewer, no in-app PDF library).
  - Backend: `GET /api/months/:month/bill/file` streams the stored PDF (`application/pdf`, inline), 404 when the bill has no file. The seed's placeholder PDF is not a valid PDF (`%PDF-1.4` plus a comment), so the seed uses the valid synthetic PDF from 6.1.
  - App: uses `expo-file-system` and `expo-intent-launcher` from the 6.2 build (check the FileProvider content URI in the current Expo docs). Download to the cache folder with the session, then fire Android's open-file intent so the "open with" chooser appears. A Spinner on the row while downloading; a danger Alert if the download fails or no PDF app exists; hide the row when the bill has no file.
  - Changes to earlier steps: simple addition (Open on the 6.6 row).
- ✅ **6.8** Mark bill paid sheet: `collected=partial|full`, `save=idle|saving|failed`. It records that Francis paid the utility company; it pays nothing. Last because it is the last thing that happens to a bill. New seed scenario `fullyCollected` (everyone paid, bill not marked paid), `DEV_NOW=2026-11-10T09:00:00+08:00`, for the full note; `collecting` (`2026-11-03`) gives the partial note.
  - Shared: the bill response gains the sheet's display text (amount prefilled, due text, alert text and tone, button label), so the sheet needs no endpoint of its own. The alert is about what has been collected ("You've collected $123.69 so far. You're covering $288.61 until the others pay" or "All $412.30 is collected"), not about the amount typed. There is no note field (the sheet has Amount paid and Paid on only); `paidNote` stays unused.
  - Backend: `POST /api/months/:month/bill/paid` sets `paidCents` and `paidOn`. 404 without a bill, 409 when already paid, 400 for a future date or an amount of zero or less. The amount may differ from the bill. Home's `settled` rule already reads `paidCents` (5.6).
  - App: `PayBillSheet` on the `AppSheet` scaffold (MoneyInput, DateField, Alert). Opened from View bill's footer and Home's bill row (`mark-bill-paid`), so both screens mount it. **How a Home action opens a sheet is decided here**, and Mark paid and Record payment (7A) reuse it. On success invalidate Home, History and the bill; the mutation stays pending until the refetch finishes (`query-keys.ts` pattern).
  - Changes to earlier steps: simple additions (`mark-bill-paid` case, invalidations, the footer button on 6.6); possible refactor of how Home hosts sheets.
- ✅ **6.9** Phase pass. Walk every state by reseeding each scenario, light and dark, on device; hex grep and 44px targets; one end-to-end run with the synthetic PDF: Home (upload) -> pick -> review -> save -> Home (unsent) -> View bill -> Open PDF -> payments -> Mark bill paid -> Home (settled); remove dead code left by earlier steps; full type check, lint and tests in `app`, `backend` and `shared`; deviations list complete.

Exit: each seeded scenario renders its design state on device, a synthetic bill can be uploaded and saved from Home and moves the month to `unsent`, and View bill, Open PDF and Mark bill paid work for every status.

---

## Phase 7: Payments and Recipient

Payments first, because Recipient has the Mark paid button and the `paid` and `paidDifferent` states.

### 7A. Payments (Mark paid and Record payment)
Source `MarkPaid.dc.html` (`full`, `different`, `record`, `recordOpen`, `recordForOpen` + `save`).

- **7A.1** (was 8.1) Backend: `POST /api/charges/:id/payment` (paidCents, paidOn, paidByPersonId), `POST /api/payments` (Record payment: from person, for charge(s)/person, amount, date; marks matching charges paid and who paid), `DELETE`/undo not in design (don't add). Marking Tenant 2's rent received creates the `Task` (SAVINGS_TRANSFER). Short payment: store what was received; difference is history only (no carry).
- **7A.2** (was 8.2) `MarkPaid` sheet: expected vs received, "Full amount" default, "Different amount" reveals MoneyField, Received on DateField, shortfall/overpayment as info Alert (**no carry/let-go Radio**, per Data Model).
- **7A.3** (was 8.3) `Record payment`: From and For SelectFields (open states are just the Select open), prefilled when launched from a row or notification Paid action.
- **7A.4** (was 8.4) Saving/failed states via the Phase 2 sheet scaffold.
- **7A.5** (was 8.5) After success invalidate Home (`/api/home`), Recipient, History; reschedule dependent notifications (Phase 9B, stubbed until then). Wire the Home row actions (Phase 5) to the Mark paid sheet.

### 7B. Recipient and messages
Source `Recipient.dc.html` (5 states: `notSent`, `sent`, `paid`, `paidDifferent`, `nudged`).

- **7B.1** (was 7.1) Backend: `GET /api/months/:month/recipients/:personId` -> breakdown lines, rendered monthly message from the template (placeholders `{name}`, `{amount}`, `{month}`, `{charge}`, `{dueDate}`, etc.; render function in backend `lib/messages/render.ts` with unit tests incl. Tagalog default text in the Brief), unpaid corrections from earlier months, history of `MessageEvent`s. `POST .../message-events` (kind MONTHLY|NUDGE, stores `renderedText`, `openedAt`). The templates come from the household config, so the seeded versions are enough until the editors exist (Phase 8, Phase 9A).
- **7B.2** (was 7.2) UI: Card with breakdown (rows, Divider, total), message preview card (custom formatting preserving line breaks, emoji), buttons: "Send on WhatsApp" (`Linking.openURL('https://wa.me/<E164 digits>?text=<encodeURIComponent>')`), "Send again", "Nudge again", Share bill button (opens the Share sheet, 7B.6), Mark paid (opens the 7A.2 sheet).
- **7B.3** (was 7.3) Record the event **after** the intent opens (and on failure to open WhatsApp show an Alert, no event). Never auto-send, no send-all. One person at a time.
- **7B.4** (was 7.4) States: show Sent/Nudged timestamps (Asia/Singapore), Paid badge, `paidDifferent` info (paid amount vs expected).
- **7B.5** (was 7.5) Entry from Home rows (wire the Home row actions from Phase 5) and notification taps (Phase 9B).
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

Source `AddCharge.dc.html`. Last of the feature screens because it is a nice to have: a wrong bill is rare, and a correction charge is its only must-have use (Replace bill is out of v1, see the Phase 6 intro).

- **11.1** (was 9A.1) Backend: `POST /api/charges/preview` (mode, split method, total, who, custom amounts, month) -> per-person cents via engine; `POST /api/charges` creates `ChargeGroup` + charges in one transaction (amounts stored, never recalculated). `Correction` = personal charge with `correctsMonth`, signed amount.
- **11.2** (was 9A.2) UI sheet: ConnectedButtonGroup Shared / Personal (Add charge is not final), single-select chips for split method (Per share, Per unit, Custom) and Who, Label, Amount (MoneyField), Month being fixed (MonthSelect, corrections), Due date, Note. Live preview card from the preview endpoint (debounced, Spinner while loading); `error` state (custom split doesn't add up) = danger Alert + Save disabled; Saving/Failed via scaffold. Replaces spike `add-charge-sheet.tsx`. Switch on the Home Add charge entry (hidden in Phase 5) and the History link to correction charges (4.2).

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
5. Phase 6: still to decide at build: the message for a non-PDF or oversized file (6.2); which billing period counts as matching a month and how the bill month is read from the PDF (6.3); the unusual-bill threshold and wording (6.3).
