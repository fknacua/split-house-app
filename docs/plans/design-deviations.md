# Design and plan deviations

Running list of where what we built differs from the design source (`docs/design/source/*.dc.html`), `docs/DESIGN.md`, the Data Model or the implementation plan. One section per screen or phase, newest at the bottom. Each row says what the design shows, what was built, and why. "Decided" means Francis chose it in conversation; "Assumed" means I took a default that has not been explicitly confirmed.

Local only, like the rest of `docs/plans/`: never stage or commit it.

The app (Phase 4.2 onwards) follows the API contract in `shared/src/api/`, not the markup, for everything below.

---

## Phase 4: History (logged 2026-10-25, during 4.1)

Source: `History.dc.html`. Contract: `shared/src/api/history.ts`. Backend: `GET /api/history` and `GET /api/history/:month`.

### Principle: backend-for-frontend

The API returns display-ready text: names, amounts (`$412.30`), dates (`3 Nov`), badge labels and tones. The app renders and navigates; it does not format or derive. Decided. Applies to all derived-only screens from now on.

### History list (`GET /api/history`)

| # | Design shows | Built | Why |
|---|---|---|---|
| L1 | Row detail line: `Utilities bill $398.75 · 5 of 5 paid · incl. Tenant 2's Dec utilities` | `details: ["Utilities bill $398.75"]` only. `details` is an array (min 1); the screen shows the first entry. | Decided: subtext is not important. The "n of m paid" counts in the mock are inconsistent (Nov says 5 of 5 with four rows plus a correction; Dec says 4 of 5 with four rows). The "incl. ... utilities" part belongs to the deferred carry state. |
| L2 | Chip `1 unpaid · carried to Jan` | Chip `N unpaid` (warning), for example `2 unpaid` | `monthCarried` is deferred (plan 4.2). No carry copy. |
| L3 | Chip `Corrected in Dec` | Chip `Corrected` (info) | Decided: the list is a high-level view; the month detail says when. |
| L4 | Footnote under the list: `February 2027 is in progress on This month. Months before November 2026 are in the old Google Sheet.` | Removed. The response is just `{ groups }`. | Decided: no value. |
| L5 | Months with a settled status show `Settled` | `Settled` (success) when every charge the month holds has a payment recorded. A short payment counts as paid (no carry). | Data Model: no carry-over. |
| L6 | Not shown | The list is built from saved `Bill` rows for months before the current month. A past month with no bill does not appear. | Assumed, from "there will always be a bill" (Francis). Not explicitly confirmed as the base of the list. |
| L7 | Not shown | Francis's own charges (`Person.isOwner`) are ignored when counting unpaid. | Decided: own charges are not needed. Otherwise the list could show `N unpaid` forever for charges Francis never pays himself. |
| L8 | Not shown | An unpaid correction counts as unpaid in the month that holds it, not in the month it corrects. | Assumed. |
| L9 | No empty state | Empty history returns `{ groups: [] }`. The empty state is for the app to design later. | Decided. |
| L10 | Chip kinds `paid`, `warn`, `info`, default | Chip tones use the app's `Badge` variant names: `neutral`, `primary`, `success`, `warning`, `danger`, `info`. | Decided: the app passes the tone straight to `Badge`. |

### Month detail (`GET /api/history/:month`)

| # | Design shows | Built | Why |
|---|---|---|---|
| D1 | Payments grouped into rows by who pays: `Tenant 2 · Rent`, `Tenant 2 · Utilities`, `Primary Tenant + Tenant 1's share`, `Tenant 1 · Rent` | One row per charge. Title is `<Label> - <Person>`, label first, plain hyphen: `Rent - Tenant 1`, `Utilities - Tenant 2`, `Starhub - Primary Tenant`. | Decided: no grouping, "payment type first then name". Tenant 1's rows are separate from the Primary Tenant's. |
| D2 | Row subtext: `Moved to savings 3 Nov`, `Utilities $82.46 + aircon $18.33`, `Incl. Tenant 1's $100.79`, `Paid you directly` | No subtext on normal rows (`details: []`). Only corrections have one (D8). | Decided: subtext not important. |
| D3 | No stated order | Unpaid rows first, then paid rows newest payment first. Ties sort by label, then person. | Decided: "sort by date of payment desc". Unpaid first is my default for unpaid rows. |
| D4 | Row badge `Paid 3 Nov` | Same. An unpaid row shows `Unpaid` (warning). | `Unpaid` wording comes from the Dec "carried" board. |
| D5 | Row amount is what was received | Row amount is what was owed (`amountCents`). A short payment looks the same as a full one. | Decided: short payment is a rare edge case on a fixed amount and schedule, so it is not covered. Revisit only if it happens. |
| D6 | Bill card: `Utilities bill · Current Charges`, amount, meta line `Due 16 Nov · you paid 16 Nov`, badge `Paid`, `View bill` link | Amount and badge only. Badge is `Paid 16 Nov` (same wording as the rows). No meta line. | Decided: the due date never changes, so it is not shown; the badge matches the row badges. |
| D7 | Bill card when the bill is not marked paid | Badge is `null` (no badge). | Not designed. Assumed: show nothing rather than invent copy. The seeded October bill is unpaid on purpose. |
| D8 | Correction row sits in the corrected month (Nov): `Correction · Tenant 2`, `-$8.20` in green, subtext `Added 2 Dec · on Dec payment`, badge `Correction` | The correction row is shown only in the month that holds the charge (Dec), not in the month it corrects. Title `Correction - Tenant 2`, subtext `Nov Utils - Added 2 Dec`, badge is the charge's own state (`Unpaid` or `Paid 7 Dec`). The corrected month (Nov) has no correction row. | Decided. The correction is an ad hoc payment created in Add charge and marked paid later, on any day. Month names are `Mmm`; the category word is `Rent`, `Utils`, `Aircon` or `Other`. |
| D9 | Banner on the corrected month: `Corrected in December` / `A -$8.20 credit for Tenant 2 was added on 2 Dec and taken off their December payment. November's amounts below stay as sent.` | Banner kept on the corrected month: `Corrected in Dec` / `A $8.20 credit for Tenant 2 was added in Dec.` One banner per correction, oldest first, in an array `banners`. Wording is `credit` for a negative amount and `charge` for a positive one. No date, no "taken off their December payment", no "stay as sent". | Subtext simplified (Decided). Keeping the banner at all is **Assumed**: Francis did not answer whether to keep it. Open: icon (board uses a pencil; the app's `Alert` may use its default `info` icon). |
| D10 | Negative amount with a real minus sign: `-$8.20` (U+2212) and green | `-$5.00` with a hyphen-minus from `formatCents`. No colour hint in the response. | Display only; the app can colour a negative amount itself, or the response can gain a field later. Not decided. |
| D11 | Not shown | Francis's own charges are not listed. | Decided. |
| D12 | Not shown | `404` for the current month or later, for a month with no saved bill; `400` for a malformed month. | Assumed: History is read-only and past-only. |
| D13 | Carried state (`monthCarried`) | Not built. | Deferred in the plan (no carry-over). |

### Data Model and plan deviations

| # | Before | Now | Why |
|---|---|---|---|
| P1 | `Charge` had `category` and `correctsMonth` only | New nullable `Charge.correctsCategory` (`ChargeCategory`: what a correction fixes). A database CHECK (`charge_correction_fields`) enforces it: a `CORRECTION` needs `correctsMonth` and `correctsCategory` (not `CORRECTION`); any other charge must not have `correctsCategory`. The Data Model doc has the new field. Migration `charge_corrects_category`, applied to the dev branch. | Decided: a correction is a charge with `category = CORRECTION`, and nothing said which category it corrects. Code-side validation is still to come in Add charge (Phase 11). |
| P2 | Plan 1.5 and `CLAUDE.md`: "all logic lives in plain functions under `backend/src/lib/`" | New code: route (controller) -> `backend/src/services/` (reads the database) -> `backend/src/lib/` (pure code only). No repository layer. Older files that query the database (`bootstrap`, `month-open`) stay in `lib/` until touched. Plan 1.5 carries a "superseded" note; `CLAUDE.md` and `backend/README.md` updated. | Decided. |
| P3 | Plan 4.1: `GET /api/history` returns "bill total, paid count, chips" | No paid count (L1). | Decided. |
| P4 | Plan 4.2 lists `monthCorrected` as the state with the banner linking to correction charges | The banner has no link (the corrected month does not show correction rows, D8). | Decided. |
| P5 | Seed: Aug, Sep, Oct bills never marked paid; one unpaid +$15 correction | Aug and Sep bills marked paid (22 Aug, 22 Sep). Oct bill left unpaid. Added a paid credit correction (Sam, -$5.00, added 2 Oct, paid 12 Oct, fixes September utilities) beside the unpaid +$15 one (Jordan, added 5 Oct). Seeded credit uses `paidCents = -500` and is marked paid by Francis. | The paid-credit encoding (`paidCents = -500`, paid by the user) is **Assumed**; Mark paid in Phase 7 may do credits differently. |

### History UI, step 4.2 (logged 2026-10-25)

Built in `app/src/screens/history/` (list) and `app/src/screens/history-month/` (month detail). Routes: `(tabs)/history` and `history/[month]` (outside the tabs, so the bottom nav is hidden, as in the design).

| # | Design shows | Built | Why |
|---|---|---|---|
| U1 | `__gallery` entries for every state | None. The states are reached with real data: `loading` while a query runs, `list` and `monthCorrected` from the seeded Aug to Oct months. | Decided: the gallery is for shared pieces only. |
| U2 | Banner icon is a pencil | The `Alert` wrapper's default `info` icon. The corrected month keeps its banner, with no link. | Decided (answers D9 and the icon question). |
| U3 | Negative amount in green | The app colours an amount that starts with `-` with the success token. | Decided: "keep it success for now", a credit is rare. This is the one rule in the app. Move it into the API (an amount tone field) if credits become common. |
| U4 | `View bill` link under the bill card | Not drawn. | Decided: hidden until the Bill screen exists (Phase 6, 6C.1). |
| U5 | No loading design for the month detail | Skeleton of its layout (bill card, Payments heading, four rows), and a skeleton in place of the header title until the month name arrives (`SubpageHeader` `loading`). | Decided. |
| U6 | `Read-only` subtitle with a lock icon | Matches the design. `SubpageHeader` gained `subtitleIcon` and `loading` props, both on the test page's Screen headers section. | Decided: add icon support to the header. Not a deviation any more; kept for the record. |
| U7 | Unpaid row tinted | Row tinted when its badge tone is `warning`. | The design tints the unpaid kind; the tone is the only signal in the response. |
| U8 | Bill amount 28/34 | `text-[28px] leading-[34px]`, no token exists for it. | Assumed. |
| U9 | No error design | A request that fails with an API error (not "can't reach the server", which has its own prompt) shows a danger Alert with the server's message text. | Assumed: no copy invented in the app. |
| U10 | Empty History | Nothing below the title. | Decided earlier (L9): the empty state is designed later. |

## Phase 5: Home (logged 2026-10-25, during planning)

Source: `Main.dc.html`. Contract (to be built in 5.1): `shared/src/api/home.ts`. Backend: `GET /api/home`. Same backend-for-frontend principle as Phase 4: the API returns display-ready text, tones and navigation targets; the app renders and navigates. Rows below are what the plan now says; each is confirmed or corrected as its step is built.

### Home (`GET /api/home`)

| # | Design shows | Built | Why |
|---|---|---|---|
| H1 | "You're fronting" `$2,725.83`: Primary's rent + Tenant 1's rent + Starhub + others' aircon shares, leaving out Tenant 2's rent and utilities | Non-owner charges other than utilities, minus what has been paid. It includes Tenant 2's rent and falls as people pay. On the seed at the start of November: $3,602.50 (no aircon charges are seeded). | Decided in direction: Home only tracks whether tenants have paid; no savings special case. The exact formula (which categories count, how corrections count) is **Assumed**; confirm in 5.1 and 5.4. |
| H2 | "Goes to savings once paid", "Paid 3 Nov · moved to savings", settled footnote "Tenant 2's $950.00 moved to savings 3 Nov" | Dropped. Settled footnote keeps only "December's bill usually lands around the 2nd." | Decided: savings is not tracked. |
| H3 | Grouped rows by payer: `Tenant 2 · Utilities`, `Primary Tenant + Tenant 1's share`, and so on (5 rows) | One row per charge, as History: `Rent · Jordan`, `Starhub · Priya`, `Utilities · Sam`, ordered by due date, with the due-day column kept. About 8 rows in the upload state. | Decided. Sam's utilities are paid via Priya and have no due day of their own, so they use Priya's due day for now (Francis will extend this to per-person due dates later). |
| H4 | Title is name first (`Tenant 2 · Rent`) | Type first (`Rent · Jordan`), like History's `Rent - Tenant 1` but keeping the design's `·` separator. Detail lines and badges follow the design boards, but dates have no weekday (`Sent 2 Nov`, not `Sent Mon 2 Nov`), in rows and in the hero date line (`3 Nov · Collecting`). | Decided. |
| H5 | Upload board at "Mon 2 Nov": `Tenant 2 · Rent` "Overdue 1 day" | At `DEV_NOW` 1 Nov the rent is due that day, so it shows "Due today" (info tint). "Overdue" first appears in 5.4 (`DEV_NOW` 3 Nov). | Decided: the working date for 5.1 to 5.3 is the 1st. |
| H6 | Header month name with a chevron (`Change month`) | Month name only, no chevron. | Assumed (explained to Francis, no objection). Home never switches months and the server picks the month; History is for other months. |
| H7 | No aircon-due or unusual-bill alert in any Home state | Not built. The old plan listed both as Home alerts; the `aircon-due` seed scenario is dropped. | Assumed (explained to Francis, no objection). Both are silent FYI notifications (Tech Stack), Phase 9B. |
| H8 | Utilities bill row shows day `16` before any bill exists | Day comes from a new optional config field `categories.utilities.billDueDay` (Nov version 16, Aug to Oct version 25). An uploaded bill's own due date supersedes it. | Decided. Additive, so `HOUSEHOLD_SCHEMA_VERSION` stays 1. Data Model doc updated. |
| H9 | No way to start the next month early | Step 5.7 adds a "Start <month>" action once the newest month is settled, and `POST /api/home/start-next-month`. Months also open on the first request on or after the 1st, even when last month is unsettled (its unpaid charges stay in History). | Decided: paydays differ, so billing often starts a few days before the 1st. **The design for the button does not exist yet and must be agreed and created before 5.7 starts.** |
| H10 | History: "past month" is a month before the calendar month | In 5.7, a past month is one before the newest opened month. | Follows from H9: October moves to History when November starts early. |

### Plan deviations (Phase 5)

| # | Before | Now | Why |
|---|---|---|---|
| Q1 | Plan 5.1 `GET /api/months/:month/summary`; 1.9 `useMonthSummary`; 7A.5 "invalidate month summary" | `GET /api/home`, `useHome`, "invalidate Home". The 1.9 placeholder (`hooks/use-month-summary.ts`, `queryKeys.monthSummary`, `MonthSummaryResponse`) is replaced in 5.1. | Decided: the response is Home's view-model, so it is named for the screen. The server picks the month. |
| Q2 | Phase 5 had 5.0 (all seed scenarios), 5.1 backend, 5.2 all states, 5.3 to 5.6 | 5.1 `upload` + `loading` (the base), 5.2 `draft`, 5.3 `unsent`, 5.4 `collecting`, 5.5 `dueToday`, 5.6 `settled`, 5.7 start next month early, 5.8 Home pass. Seed scenarios are built inside each step; 5.0 is removed. | Decided: one step per state, each building on the last, as Phase 4. |
| Q3 | Seed scenarios run with `npm run seed:reset -- --scenario <name>` | `npx prisma db seed -- --scenario <name>` from `backend/` (Prisma docs). 5.1 confirms the flag reaches the script. | Looked up in the Prisma seeding docs. |
| Q4 | Plan 5.4/5.5: Add charge and Mark bill paid entries hidden until their phases | Everything the design shows is rendered, and actions to unbuilt screens do nothing. Only Add charge stays hidden (Phase 11). | Decided: Home has to be checkable against the data. |

## Still to decide or carry forward

- Phase 11 (Add charge): code-side validation of the correction fields (P1); how a credit is marked paid (P5).
- Short payment and unpaid-bill states stay undesigned (D5, D7).
- Phase 5: the "Due in N days" window in 5.4 (proposed N of 3 or less); the design for the start-next-month action before 5.7.
