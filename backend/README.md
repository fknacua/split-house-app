# SplitHouse backend

Next.js route handlers on Vercel, Prisma, Better Auth, Neon Postgres. Route files are thin wrappers (`route(...)` from `src/lib/api.ts`); the logic lives in plain functions under `src/lib/`.

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
| `GET /api/bootstrap` | `hasHousehold`, `currentMonth`, `setupProgress` (the five first-run steps), `settings.notifications` | 3.5 | built |
| `GET /api/setup/progress` | First-run steps, derived from the household version and settings | 10.4 | planned |
| `GET /api/household` | Current and upcoming version, people, version history | 8.1 | planned |
| `POST /api/household/preview` | Per-person amounts for a draft config and starts-from month | 8.1 | planned |
| `POST /api/household/versions` | Create an immutable version (starts-from rule, shares add up) | 8.1 | planned |
| `POST /api/people` | Add a person | 8.1 | planned |
| `DELETE /api/household/versions/:id` | Remove a not-yet-started future version only | 8.1 | planned |
| `GET /api/months/:month/summary` | Home: status, hero totals, person rows, alerts, draft info | 5.1 | planned |
| `POST /api/months/:month/bill-draft` | Upload a PDF, parse it, return fields, lines, warnings | 6A.1 | planned |
| `POST /api/months/:month/bill-draft/discard` | Discard the month's draft | 6A.3 | planned |
| `POST /api/months/:month/bill` | Save the bill and create the utilities charges | 6A.3 | planned |
| `GET /api/months/:month/bill/file` | Stream the stored PDF | 6A.3 | planned |
| `POST /api/months/:month/bill/paid` | Mark bill paid (amount, date, note) | 6A.3 | planned |
| `GET /api/months/:month/recipients/:personId` | Breakdown, rendered message, corrections, message events | 7B.1 | planned |
| `POST /api/months/:month/recipients/:personId/message-events` | Record a chat opened or nudged (MONTHLY or NUDGE) | 7B.1 | planned |
| `POST /api/charges/:id/payment` | Mark paid (paid cents, date, who paid) | 7A.1 | planned |
| `POST /api/payments` | Record payment for charge(s) or a person | 7A.1 | planned |
| `POST /api/charges/preview` | Per-person cents for a new charge, via the engine | 11.1 | planned |
| `POST /api/charges` | Create a charge group and its charges | 11.1 | planned |
| `GET /api/history` | Months list: bill total, paid count, chips | 4.1 | planned |
| `GET /api/history/:month` | A month's charges with paid state, corrections, banner flags | 4.1 | planned |
| `GET /api/settings`, `PUT /api/settings` | Notification toggles | 9A.1 | planned |
| `GET /api/notifications/plan` | Computed reminder triggers; the app only schedules them | 9B.4 | planned |

Message template edits go through `POST /api/household/versions` (9A.1).
