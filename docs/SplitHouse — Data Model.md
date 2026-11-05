# SplitHouse — Data Model

Oct 15, 2026 · @Francis · Draft v0

## Status and purpose

This doc defines the data model that the Tech Stack and the Design Brief require. It is the input for the Prisma schema. Decisions below are settled; anything marked **Confirm** is a default I chose and still needs a yes or no.

Stack it assumes: Postgres on Neon, Prisma, Next.js route handlers on Vercel, Better Auth for sessions. Money is integer cents (SGD). Months are `YYYY-MM` keys. Dates and "current month" use the Asia/Singapore time zone.

## Settled decisions

- **Versioned settings.** Every save on Household (and the settings that follow its "starts from" rule) creates a new immutable `HouseholdVersion` stamped with a starts-from month. A month uses the newest version that starts on or before it. A version becomes immutable once a month has opened using it. Until then it is still upcoming: more edits for the same starts-from month are added to that one version, and they all apply when the month opens.
- **Saved amounts.** Charges are created with their cents stored. They are never recalculated from settings later.
- **Edits never touch existing months.** A Household edit always starts **next month**, the month after the current one, with no choice of month, so it can never affect a month whose charges already exist. View and Edit show the latest saved values, with a note until they take effect. "Current month" here is the newest opened month, so once December is started early, edits start from January. Fixing a past or current month is done with a correction charge. There is no regenerate step.
- **First-run exception.** The very first version, created in first-run setup, starts in the current month, with no choice. First run blocks the app until its required steps are done, and no month opens before then, so quitting partway resumes where it left off.
- **Payments are paid fields on the Charge.** No separate Payment table. Recording a payment marks charges paid, with who paid.
- **Split engine** is one pure function that runs only on the backend. Add charge and Household previews call preview endpoints. Its unit tests use the Nov 2026 fixtures below.
- **Rounding rule.** Every person except Francis gets their exact share rounded to the nearest cent (half up). Francis gets the total minus everyone else, so shares always add up to the amount.
- **Replace bill.** If the month's charges are unsent and unpaid, Replace recreates the utilities charges. If any are sent or paid, Replace shows the difference per person and creates correction charges for it. The corrections are a record only: no new message is sent, and Francis settles the difference offline and marks the correction paid. An unpaid correction appears in that person's next monthly breakdown. *(Not built in v1, deferred: a wrong bill is fixed with a correction charge.)*

## Entities

### Person
`id`, `name`, `whatsappE164`, `color`, `isOwner` (Francis), `isActive`. People are never hard-deleted because charges reference them. When someone is removed, a new `HouseholdVersion` stops including them from the starts-from month. `color` is one of nine names (`BLUE`, `ORANGE`, `GREEN`, `PURPLE`, `PINK`, `TEAL`, `GOLD`, `BROWN`, `SLATE`), not a hex, so light and dark stay in sync. Teal is only for the owner, and duplicates among the others are allowed. Like `name`, it saves right away and is not versioned, so past months show the current color.

### HouseholdVersion
`id`, `startsFromMonth` (unique), `schemaVersion`, `config` (JSON validated in code), `createdAt`. Immutable.

`config` (`schemaVersion` 3) holds:
- **Rooms:** see Rooms below.
- **Per person:** `roomId`, utility shares (stored as thousandths, so 1.5 shares is 1500), payment route per charge type (`DIRECT` or `VIA` another person), due day per charge type, deposit held. Recurring charges have no route or day of their own: they follow the person's utilities route and due day, and a `RECURRING` entry is accepted but not used.
- **Rent category:** `landlordRentCents`, `landlordDueDay` (required, 1 to 31; shown on the Household rent card, and nothing is charged or reminded from it), and the split between Francis and Primary tenant in basis points (5000/5000 by default).
- **Utilities category:** `totalShares`, the same split, and `billDueDay`, an optional fixed day of the month (1 to 31). Home uses it to place the bill row before a bill exists; the due date of an uploaded bill supersedes it.
- **Aircon category:** only the same split. The total comes from the rooms.
- **Recurring charges:** label, amount in cents (above zero), person (Primary tenant or a tenant), optional end month, the last month charged (Starhub $27.50 for Primary tenant).

### Rooms
A list inside `config`, not a table, so a room change starts next month like any other dated edit. Every room has `id`, `roomType`, `name` and `airconUnits`. `roomType` is set when the room is created and never edited.

| `roomType` | Extra fields | People | Can be removed |
| --- | --- | --- | --- |
| `MASTER` | None; its rent is calculated, never stored | Francis and Primary tenant | No |
| `TENANT` | `rentCents`, `includeInTotal` | One tenant, or empty | Only when empty |
| `COMMON` | None | None | Yes |

- **A person points to their room** with `roomId`. A room's people are worked out from that, and a room with no one in it is empty. Nothing stores "empty". One tenant per `TENANT` room is a check, not part of the shape, so one room to many tenants can come later. Moving a tenant between rooms is not supported: they are removed and re-added.
- **Master rent** = `landlordRentCents` minus the `rentCents` of occupied `TENANT` rooms with `includeInTotal` on. Francis and Primary tenant split it by basis points.
- **`includeInTotal` off:** the rent is still charged to the tenant, but it is not part of what goes to the landlord.
- **An empty `TENANT` room** keeps its `rentCents` and `includeInTotal` for the next tenant. Until someone moves in it is not subtracted, so Francis and Primary tenant cover it.
- **Aircon:** the total is the sum of every room's `airconUnits`. A tenant pays for their room's units. Francis and Primary tenant split all the others, including those in common and empty rooms.
- **Utility shares and the deposit** belong to the person, so a tenant who leaves takes their shares out of `totalShares`.
- **The rooms stat** counts `MASTER` and `TENANT` rooms, occupied or not.

These amounts are worked out by one pure backend helper, `lib/household/room-amounts.ts`: `masterRentCents`, `totalAirconUnits`, `sharedAirconUnits`, `roomCount`, `roomOf`, `tenantRentCents` and `peopleIn`.

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

### Settings
One row: notification toggles per channel and type. Theme stays on the device.

### MessageTemplates
One row, `templates` (JSON validated in code), `updatedAt`. Not versioned: a save applies immediately to every message not yet sent, since wording changes no money and what was sent stays in `MessageEvent.renderedText`. With no row yet, the Brief's default text is used. It holds the monthly breakdown and nudge text, per-person overrides, custom line labels, and optional custom section titles per person (the title of the breakdown section holding that person's lines, without the colon; without one it reads "Yours" or "{name}'s (please collect)"). Template text is sent as written, including any WhatsApp `*bold*` markers in it.

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
- **Room checks on every config:** room ids are unique; room names are unique, ignoring case; there is exactly one `MASTER` room; every `roomId` exists; Francis and Primary tenant are in the `MASTER` room; a tenant is in a `TENANT` room; a `TENANT` room has at most one tenant; master rent is not below zero (exactly zero is allowed); the household has at least one aircon unit.
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

Landlord rent 430000, due on the 1st.

| Room | `roomType` | `rentCents` | `includeInTotal` | `airconUnits` | Who |
| --- | --- | --- | --- | --- | --- |
| Master room | `MASTER` | 335000 (calculated) | | 1 | Francis, Primary tenant |
| Room 2 | `TENANT` | 95000 | On | 1 | Tenant 1 |
| Room 3 | `TENANT` | 95000 | Off | 1 | Tenant 2 |
| Living room | `COMMON` | | | 2 | |
| Utility room | `COMMON` | | | 1 | |

Checks:
- Utilities: 12369 + 8246 + 8246 + 12369 = 41230 (the bill).
- Aircon: 3667 + 1833 + 1833 + 3667 = 11000, across 6 units: 1 each for the tenants, and 4 split between Francis and Primary tenant.
- Landlord rent: 95000 (Room 2) + 335000 (master) = 430000. Room 3's 95000 is not landlord rent.
- Primary tenant's message total without aircon: 167500 + 12369 + 2750 + 8246 = 190865.

## Other settled points (no open items)

- **Lazy month open** is settled. The alternative is a daily Vercel cron, which Hobby allows once a day.
- **Deposit** is settled: informational in the config (Tenant 2 $950 held), not a ledger.
