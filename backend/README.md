# SplitHouse backend

Next.js route handlers on Vercel, Prisma, Better Auth, Neon Postgres. Route files are thin wrappers (`route(...)` from `src/lib/api.ts`); the logic lives in plain functions under `src/lib/`.

## Conventions

- Every route except `api/auth/*` needs a session: `requireSession(request)` throws a 401.
- Errors are always `{ error: { code, message } }` (`ApiError` in `src/lib/api.ts`).
- Request bodies and queries are validated with zod (`parseBody`, `parseQuery`).
- Money is integer cents (SGD). Months are `YYYY-MM` keys, with the current month taken in Asia/Singapore.
- The app never calculates splits. Previews come from the preview endpoints.
- No `dynamic` export on routes (Cache Components is on; session reads already run at request time).

## Commands

```bash
npm run dev          # local server (add -H 0.0.0.0 to reach it from a phone on the LAN)
npm test             # vitest
npm run typecheck
npm run lint
npm run seed:reset   # wipe the domain tables and reseed (refuses in production)
```

## Endpoints (v1 contract)

Written as each screen needs them. Update the status here when an endpoint is built, and add its response types to `app/src/lib/api-types.ts` in the same change.

| Endpoint | Purpose | Phase | Status |
|---|---|---|---|
| `GET /api/auth/*` | Better Auth (Google sign-in, sessions) | 0 | built |
| `GET /api/me` | Signed-in email; checks a session end to end | 1.7 | built |
| `GET /api/bootstrap` | `hasHousehold`, `currentMonth`, `setupProgress`, `settings` | 3.5 | planned |
| `GET /api/setup/progress` | First-run steps, derived from the household version and settings | 4A.4 | planned |
| `GET /api/household` | Current and upcoming version, people, version history | 4B.1 | planned |
| `POST /api/household/preview` | Per-person amounts for a draft config and starts-from month | 4B.1 | planned |
| `POST /api/household/versions` | Create an immutable version (starts-from rule, shares add up) | 4B.1 | planned |
| `POST /api/people` | Add a person | 4B.1 | planned |
| `DELETE /api/household/versions/:id` | Remove a not-yet-started future version only | 4B.1 | planned |
| `GET /api/months/:month/summary` | Home: status, hero totals, person rows, alerts, draft info | 5.1 | planned |
| `POST /api/months/:month/bill-draft` | Upload a PDF, parse it, return fields, lines, warnings | 6A.1 | planned |
| `POST /api/months/:month/bill-draft/discard` | Discard the month's draft | 6A.3 | planned |
| `POST /api/months/:month/bill` | Save the bill and create the utilities charges | 6A.3 | planned |
| `GET /api/months/:month/bill/file` | Stream the stored PDF | 6A.3 | planned |
| `POST /api/months/:month/bill/paid` | Mark bill paid (amount, date, note) | 6A.3 | planned |
| `GET /api/months/:month/recipients/:personId` | Breakdown, rendered message, corrections, message events | 7.1 | planned |
| `POST /api/months/:month/recipients/:personId/message-events` | Record a chat opened or nudged (MONTHLY or NUDGE) | 7.1 | planned |
| `POST /api/charges/:id/payment` | Mark paid (paid cents, date, who paid) | 8.1 | planned |
| `POST /api/payments` | Record payment for charge(s) or a person | 8.1 | planned |
| `POST /api/charges/preview` | Per-person cents for a new charge, via the engine | 9A.1 | planned |
| `POST /api/charges` | Create a charge group and its charges | 9A.1 | planned |
| `GET /api/history` | Months list: bill total, paid count, chips | 9B.1 | planned |
| `GET /api/history/:month` | A month's charges with paid state, corrections, banner flags | 9B.1 | planned |
| `GET /api/settings`, `PUT /api/settings` | Notification toggles | 10A.1 | planned |
| `GET /api/notifications/plan` | Computed reminder triggers; the app only schedules them | 11.4 | planned |

Message template edits go through `POST /api/household/versions` (10A.1).
