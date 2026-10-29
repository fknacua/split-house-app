# SplitHouse backend

Next.js route handlers on Vercel, Prisma, Better Auth, Neon Postgres. Route files are thin wrappers (`route(...)` from `src/lib/api.ts`); the controller calls a service in `src/services/`, which reads the database and passes the result to pure functions in `src/lib/`. `src/lib/` holds pure code (the split engine, builders, helpers) plus shared plumbing such as `api.ts`, `auth.ts` and `prisma.ts`. There is no repository layer; add one when several services need the same query. Older files that query the database (`bootstrap`, `month-open`) still sit in `src/lib/` and move when touched.

## Environment

Set this up before running the server. Copy `.env.example` to `.env` (never committed) and fill in the values. This file is for local development only: production values are set as environment variables in the Vercel project.

- `DATABASE_URL`: Neon pooled connection string, used by the running server. Point it at the `dev` branch.
- `DIRECT_URL`: Neon direct connection string, used for migrations only.
- `BETTER_AUTH_SECRET`: a long random string (`openssl rand -base64 32`), different from production.
- `BETTER_AUTH_URL`: this server's own address as the phone reaches it, `http://<PC-LAN-IP>:3000`. Use your computer's IPv4 address from `ipconfig`, not the phone's. `localhost` does not work for the app, and the address can change, so check it each session.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: the Google OAuth Web client, used to verify the Google sign-in.
- `ALLOWED_EMAIL`: the only email that may sign in.

Restart the server after changing `.env`.

## Run locally

From `backend/`, start the server so it listens on the network, because the phone connects to your computer over the LAN:

```bash
npm run dev -- -H 0.0.0.0
```

Wait for the "Ready" line. The first request after the database has been idle for 5 minutes is slow, because the free Neon database sleeps and wakes on demand.

The app side, including which backend it points at, is covered in the app README. `BETTER_AUTH_URL` and the app's `EXPO_PUBLIC_BACKEND_URL` must hold the same value; see [Keeping the two env files in sync](../README.md#keeping-the-two-env-files-in-sync).

## Conventions

- Every route except `api/auth/*` needs a session: `requireSession(request)` throws a 401.
- Errors are always `{ error: { code, message } }` (`ApiError` in `src/lib/api.ts`).
- Request bodies and queries are validated with zod (`parseBody`, `parseQuery`).
- Money is integer cents (SGD). Months are `YYYY-MM` keys, with the current month taken in Asia/Singapore.
- The app never calculates splits. Previews come from the preview endpoints.
- No `dynamic` export on routes (Cache Components is on; session reads already run at request time).

## Commands

```bash
npm run dev          # local server (use -H 0.0.0.0 for the phone, see Run locally)
npm test             # vitest
npm run typecheck
npm run lint
npm run seed:reset   # wipe the domain tables and reseed (refuses in production)
```

## Endpoints (v1 contract)

Written as each screen needs them. Update the status here when an endpoint is built, and add its request and response schemas to `shared/src/api/` in the same change. The app imports the types from `@splithouse/shared`, and a backend test checks the real response against the schema.

| Endpoint | Purpose | Phase | Status |
|---|---|---|---|
| `GET /api/auth/*` | Better Auth (Google sign-in, sessions) | 0 | built |
| `GET /api/me` | Signed-in email; checks a session end to end | 1.7 | built |
| `GET /api/bootstrap` | `hasHousehold`, `currentMonth` (the active month: the newest opened, or the calendar month when later), `setupProgress` (the five first-run steps), `settings.notifications` | 3.5 | built |
| `GET /api/history` | Past months with a saved bill, grouped by year, newest first: name, bill total line and status chips (Settled or N unpaid, Corrected). Display-ready text | 4.1 | built |
| `GET /api/history/:month` | One past month: bill amount with Paid badge, one row per charge (`Rent - Name`, amount, Paid date or Unpaid), unpaid first then newest payment first, then a Correction row and an info banner for each correction made to the month later. User's own charges left out. 404 for the active month (the newest opened) or a later one, or no bill. Short payments and the unpaid-bill state are not designed yet | 4.1 | built |
| `GET /api/home` | The newest opened month, ready to render: hero (date line, three steps, waiting body with the fronting and bill tiles), one row per non-owner charge by due date with badge, actions and link, and the footer button. Opens the calendar month on first request; 409 `no_household` before first run. Statuses built: `bill_missing` (5.1), `draft` (5.2) and `unsent` (5.3: a saved bill, utilities rows `Not sent` until their payer's MONTHLY message exists, no footer button) and `collecting` (5.4: every message out; overdue, due-soon and sent chips, Nudge and Mark paid actions, fronting and bill coverage hero, `Record payment` footer; a payment due today adds the hero Alert and a row note, 5.5) and `settled` (5.6: everything paid and the bill paid, no footer). A settled month also returns `nextMonthAction` (the fixed label `Start next month` and the Close dialog text, 5.7); it is null otherwise | 5.1 | built |
| `POST /api/home/start-next-month` | Opens the month after the newest opened one, ahead of the 1st, and returns `{ month }`. 409 `not_settled` unless the newest month is settled, 409 `month_already_open` if the next month is open, 409 `no_household` when no version covers it | 5.7 | built |
| `GET /api/setup/progress` | First-run steps, derived from the household version and settings | 10.4 | planned |
| `GET /api/household` | Current and upcoming version, people, version history | 8.1 | planned |
| `POST /api/household/preview` | Per-person amounts for a draft config and starts-from month | 8.1 | planned |
| `POST /api/household/versions` | Create an immutable version (starts-from rule, shares add up) | 8.1 | planned |
| `POST /api/people` | Add a person | 8.1 | planned |
| `DELETE /api/household/versions/:id` | Remove a not-yet-started future version only | 8.1 | planned |
| `GET /api/months/:month/summary` | Home: status, hero totals, person rows, alerts, draft info | 5.1 | planned |
| `POST /api/months/:month/bill-draft` | Upload the bill PDF (multipart, field `file`) as the month's draft, replacing any old one and purging drafts left for earlier months; read it and return the file line (`2 pages · 214 KB`), `readOk` and the fields read (Current Charges, bill month, due date, billing period, the Subtotal before GST, and the lines: Electricity, Gas, Water and Refuse Removal). An unreadable PDF is still stored, with `readOk: false`. 413 `file_too_large` over 4 MB, 415 `not_pdf` without the PDF signature, 409 `month_not_open` or `bill_exists` | 6.2 | built |
| `GET /api/months/:month/bill-draft` | The month's stored draft, same shape as the upload. 404 `no_draft` | 6.2 | built |
| `POST /api/months/:month/bill-draft/check` | Checks the Review bill values as they are typed (the form's values, any of them null) and returns `blockers`: what stops Save, each with the field, an Alert title and text, and the short field error. Built so far: the bill month is not the month the upload started from; the billing period does not start in the month before the upload month (a bill pays for the month before it; judged against the upload month so it stays flagged while the bill month is also wrong), ends before it starts, or ends more than 30 days after it starts. Also returns `linesNote`, a warning that never blocks Save: "N lines not found" while any line has no amount, otherwise the difference when the lines do not add up to the bill's Subtotal (sent as `subtotalCents`, read from the PDF and not editable). It is null when they match, or with no lines, or with every line filled in and no Subtotal. Also returns `warnings`, the lines of the app's "Save with warnings?" dialog: the lines note's title (e.g. "2 lines not found"), then "This bill is X% higher/lower than your recent bills." when Current Charges is more than 25% above or below the average of the last 3 saved bills before the month (fewer if fewer exist; none with no saved bills). Never a blocker. Nothing is stored | 6.3 | built |
| `POST /api/months/:month/bill-draft/discard` | Delete the month's draft, file and all; returns `{ month }`. A month with no draft answers the same, so Cancel while the upload is on its way can discard whatever was stored | 6.4 | built |
| `POST /api/months/:month/bill` | Save the bill from the month's draft with the reviewed values, in one transaction: `Bill`, `BillFile`, the utilities charges from the split engine, draft deleted; returns `{ month }`. 400 when Current Charges is not above zero or the bill month, due date or billing period is missing, 422 `bill_blocked` when a check stops Save (the same checks as `bill-draft/check`), 404 `no_draft`, 409 `bill_exists` or `month_not_open` | 6.2 | built |
| `GET /api/months/:month/bill` | View bill, display-ready: header month, Current Charges with its chip (`Due in N days`, `Due today`, `Due tomorrow`, `Overdue N days` or `Paid 16 Nov`) and the saved lines; the collection card (`Collected so far` or `Fully collected`, covered of total, percent; covered is the user's own share plus what others paid, the same function Home uses) with a row per utilities charge, the user first as `You` with `Covered`, everyone else `Paid 5 Nov`, `Not sent` (their payer's monthly message not opened), `Overdue N days` or `Waiting`; facts (Bill month, Billing period, Due date, `You paid`); the file row (name, `2 pages · added 2 Nov`) or null; and `Mark bill paid` only on the month Home shows while every message is out and the bill is unpaid. 404 `no_bill` | 6.6 | built |
| `GET /api/months/:month/bill/file` | The saved bill's PDF (`application/pdf`, `Content-Disposition: inline` with the file name), for View bill's Open. 404 `no_bill` or `no_file` | 6.7 | built |
| `POST /api/months/:month/bill/paid` | Mark bill paid (amount, date, note) | 6A.3 | planned |
| `GET /api/months/:month/recipients/:personId` | Breakdown, rendered message, corrections, message events | 7B.1 | planned |
| `POST /api/months/:month/recipients/:personId/message-events` | Record a chat opened or nudged (MONTHLY or NUDGE) | 7B.1 | planned |
| `POST /api/charges/:id/payment` | Mark paid (paid cents, date, who paid) | 7A.1 | planned |
| `POST /api/payments` | Record payment for charge(s) or a person | 7A.1 | planned |
| `POST /api/charges/preview` | Per-person cents for a new charge, via the engine | 11.1 | planned |
| `POST /api/charges` | Create a charge group and its charges | 11.1 | planned |
| `GET /api/settings`, `PUT /api/settings` | Notification toggles | 9A.1 | planned |
| `GET /api/notifications/plan` | Computed reminder triggers; the app only schedules them | 9B.4 | planned |

Message template edits go through `POST /api/household/versions` (9A.1).
