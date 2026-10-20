# SplitHouse implementation plan — progress log

## 2026-10-21: 1.2 ✅

Verified the household config zod schema, its unit tests, and the Nov 2026 fixture already committed in 9acf839 — cross-checked every fixture number (rent, utility/aircon shares, deposit, recurring charge, remainder basis points) against the Data Model doc's Nov 2026 table and they reconcile. Hit a blocker running the backend's checks: `npm install` failed with an ERESOLVE conflict (vitest@5 peer-requires `@types/node@^22||>=24`, backend declared `^20`). Francis bumped `@types/node` to `^22` and ran the install and checks himself; tests, typecheck and lint all passed. Marking 1.2 done on that basis.

## 2026-10-21: 1.3 ✅

Added the pure split engine (`backend/src/lib/split/engine.ts`): `splitByShares`, `splitByUnits`, `splitCustom` with their hard checks, plus `buildMonthCharges` (rent + recurring) and `buildUtilitiesCharges` (bill-driven utilities split), all following the half-up/Francis-gets-remainder rounding rule. Unit tests cover every number in the plan's checklist — the utilities and aircon fixture sums, landlord rent 430000, Primary's message total 190865, and the three grand totals (186286/10079/183536) — plus the hard-check error paths. Tests (26 total), typecheck and lint all pass.

## 2026-10-21: 1.4 ✅

Added `backend/src/lib/now.ts` (the `DEV_NOW`-honouring clock, with tests) and `VERSION_A_CONFIG` (Aug-Oct 2026, slightly different rent/shares from the Nov fixture) to `backend/src/lib/fixtures/household.ts`. Wrote `backend/prisma/seed.ts`, wired as the Prisma seed command (`prisma.config.ts` `migrations.seed`, run via `tsx`) and exposed as `npm run seed:reset`; it refuses to run when `NODE_ENV === "production"` (Francis chose a NODE_ENV-only guard over an explicit dev-branch host check or a Neon API lookup, since there's no documented way to identify the dev branch from the connection string) and always wipes the domain tables (never the Better Auth tables) before reseeding. Seeds Aug/Sep/Oct 2026 on version A (Aug fully paid and settled; Sep fully paid but corrected in October via a `correctsMonth` charge; Oct has Sam's rent short-paid by $20 and Jordan's rent left unpaid) plus Nov 2026 on version B with rent/recurring only (no bill, so Home starts in `upload`) — all built through the Phase 1.3 engine functions. Ran it against the dev DB (Francis confirmed) and verified row counts and the payment-state fixtures directly via Prisma. Tests (29 total), typecheck and lint all pass.
