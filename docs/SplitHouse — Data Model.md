# SplitHouse — Data Model

Oct 15, 2026 · @Francis · Draft v0

## Status and purpose

This doc defines the data model that the Tech Stack and the Design Brief require. It is the input for the Prisma schema. Decisions below are settled; anything marked **Confirm** is a default I chose and still needs a yes or no.

Stack it assumes: Postgres on Neon, Prisma, Next.js route handlers on Vercel, Better Auth for sessions. Money is integer cents (SGD). Months are `YYYY-MM` keys. Dates and "current month" use the Asia/Singapore time zone.

## Settled decisions

- **Versioned settings.** Every save on Household (and the settings that follow its "starts from" rule) creates a new immutable `HouseholdVersion` stamped with a starts-from month. A month uses the newest version that starts on or before it. Old versions are never edited.
- **Saved amounts.** Charges are created with their cents stored. They are never recalculated from settings later.
- **Edits never touch existing months.** A Household edit must start **after the current month** (next month or later), so it can never affect a month whose charges already exist. "Current month" here is the newest opened month, so once December is started early, edits start from January. Fixing a past or current month is done with a correction charge. There is no regenerate step.
- **First-run exception.** The very first version, created in first-run setup, may start at the go-live month (Nov 2026).
- **Payments are paid fields on the Charge.** No separate Payment table. Recording a payment marks charges paid, with who paid.
- **Split engine** is one pure function that runs only on the backend. Add charge and Household previews call preview endpoints. Its unit tests use the Nov 2026 fixtures below.
- **Rounding rule.** Every person except Francis gets their exact share rounded to the nearest cent (half up). Francis gets the total minus everyone else, so shares always add up to the amount.
- **Replace bill.** If the month's charges are unsent and unpaid, Replace recreates the utilities charges. If any are sent or paid, Replace shows the difference per person and creates correction charges for it. The corrections are a record only: no new message is sent, and Francis settles the difference offline and marks the correction paid. An unpaid correction appears in that person's next monthly breakdown. *(Not built in v1, deferred: a wrong bill is fixed with a correction charge.)*

## Entities

### Person
`id`, `name`, `whatsappE164`, `isOwner` (Francis), `isActive`. People are never hard-deleted because charges reference them. When someone is removed, a new `HouseholdVersion` stops including them from the starts-from month.

### HouseholdVersion
`id`, `startsFromMonth` (unique), `schemaVersion`, `config` (JSON validated in code), `createdAt`. Immutable.

`config` holds:
- **Per person:** fixed rent in cents, utility shares (stored as thousandths, so 1.5 shares is 1500), aircon units, payment route per charge type (`DIRECT` or `VIA` another person), due day per charge type, deposit held.
- **Per category (rent, utilities, aircon):** total shares or units, and the remainder split between Francis and Primary tenant in basis points (5000/5000 by default).
- **Utilities bill due day:** an optional fixed day of the month (1 to 31). Home uses it to place the bill row before a bill exists; the due date of an uploaded bill supersedes it.
- **Recurring charges:** label, amount in cents, person, optional end month (Starhub $27.50 for Primary tenant).
- **Message templates:** monthly breakdown and nudge, per-person overrides, custom line labels.

### Month
`month` (unique `YYYY-MM`), `householdVersionId` (the version pinned when the month opened), `openedAt`. Status (bill missing, messages unsent, collecting, settled) is derived, not stored.

### Bill, BillFile, BillDraft
- **Bill:** `month` (unique), `currentChargesCents`, `billingPeriodStart`, `billingPeriodEnd`, `dueDate`, `lines` (JSON list of label and cents), `parseStatus` (`PARSED`, `NOT_PARSED`, `MANUAL`), `paidCents`, `paidOn`, `paidNote`. No `provider` column: v1 reads one bill layout and nothing displays which provider issued it, so it would only ever be dead data (decided 2026-10-29, step 6.1).
- **BillFile:** `billId` (unique), `filename`, `mimeType`, `sizeBytes`, `bytes`. A separate table so bill lists never load file bytes. Behind a small storage interface (save, get, delete).
- **BillDraft:** `month` (unique), `filename`, `bytes`, `parsedJson`, `parseOk`, `expiresAt` (filled, not enforced in v1). Save moves the draft into Bill and BillFile in one transaction. Lazy purge runs when a draft is promoted or a new one is uploaded.

### Charge
One row per person per obligation.
`id`, `month`, `personId` (who owes), `payViaPersonId` (route, nullable), `category` (`RENT`, `UTILITIES`, `AIRCON`, `RECURRING`, `ONE_OFF`, `CORRECTION`), `label`, `amountCents` (signed), `dueDate`, `billId` (nullable), `chargeGroupId` (nullable), `correctsMonth` (nullable), `correctsCategory` (nullable; what a `CORRECTION` fixes, e.g. `UTILITIES`; required when `category` is `CORRECTION` and null otherwise, enforced by a database check), `householdVersionId` (the version used to compute it), `paidCents`, `paidOn`, `paidByPersonId`.
Paid, unpaid, due today and overdue are derived from these fields.

### ChargeGroup
For one-offs added from the Add charge sheet: `id`, `scope` (`SHARED` or `PERSONAL`), `splitMethod` (`PER_SHARE`, `PER_UNIT`, `CUSTOM`), `totalCents`, `note`, `correctsMonth`. It keeps the original input so the sheet can show what produced the per-person charges.

### MessageEvent
`id`, `month`, `personId`, `kind` (`MONTHLY` or `NUDGE`), `chargeId` (nullable), `renderedText`, `openedAt`. The app cannot know whether WhatsApp actually sent anything, so this records when the chat was opened.

### Task
`id`, `type` (`SAVINGS_TRANSFER`), `month`, `chargeId`, `amountCents`, `doneAt`. Created when Tenant 2's rent is marked received.

### Settings
One row: notification toggles per channel and type. Theme stays on the device.

### Auth
Better Auth tables (`user`, `session`, `account`, `verification`). Sign-in is allowed only for Francis's Google account, checked on the backend against a configured email. Signing in on a new phone revokes other sessions.

## Rules the model enforces

- **Month opens lazily.** The first request on or after the 1st creates the `Month`, pins the current `HouseholdVersion`, and creates the rent and recurring charges.
- **A settled month can open the next one early.** Paydays differ, so billing often starts a few days before the 1st. Once the newest opened month is settled, Home offers "Start next month", which opens the month after it the same way (pinning the `HouseholdVersion` that covers that month). The request is refused if the newest month is not settled or the next month is already open. "Current month" then means the newest opened month, not the calendar month. There is no undo; fix mistakes with correction charges.
- **Utilities charges are created when a bill is saved**, in the same transaction.
- **Aircon and other one-offs** are created from the Add charge sheet.
- **Corrections** are charges with `correctsMonth` set, positive or negative, landing on the next payment.
- **Short payment:** there is no carry. Mark paid records the amount received, and any shortfall is history only. To collect it later, Francis adds a one-off charge by hand. The carry-or-let-go choice in the Mark paid design (the Radio in the gluestack mapping) is removed at build time; the sheet just shows the difference.
- **Validation:** utilities shares add to the bill's Current Charges and aircon shares add to the charge total, as hard checks in the engine. Bill lines adding up to Current Charges is only a warning.
- **Fixtures:** the Nov 2026 data below is the seed and the test data.

## Nov 2026 fixtures (cents)

| Person | Rent | Utilities | Aircon | Other | Total |
| --- | --- | --- | --- | --- | --- |
| Primary tenant | 167500 | 12369 | 3667 | 2750 (Starhub) | 186286 |
| Tenant 1 (via Primary tenant) | | 8246 | 1833 | | 10079 |
| Tenant 1 rent (direct) | 95000 | | | | 95000 |
| Tenant 2 rent | 95000 | | | | 95000 |
| Tenant 2 utilities | | 8246 | 1833 | | 10079 |
| Francis (own share) | 167500 | 12369 | 3667 | | 183536 |

Checks:
- Utilities: 12369 + 8246 + 8246 + 12369 = 41230 (the bill).
- Aircon: 3667 + 1833 + 1833 + 3667 = 11000.
- Landlord rent: 95000 (Tenant 1) + 335000 (master) = 430000. Tenant 2's 95000 is not landlord rent.
- Primary tenant's message total without aircon: 167500 + 12369 + 2750 + 8246 = 190865.

## Other settled points (no open items)

- **Lazy month open** is settled. The alternative is a daily Vercel cron, which Hobby allows once a day.
- **Deposit** is settled: informational in the config (Tenant 2 $950 held), not a ledger.
