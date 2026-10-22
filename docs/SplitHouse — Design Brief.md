# SplitHouse — Design Brief

Oct 3, 2026 · @Francis

## Overview

This brief records the design of the v1 screens and flows for a personal Android app that splits Francis's household rent, utilities and shared costs, and sends each person their breakdown on WhatsApp in one tap. It replaces a Google Sheet that was copied tab by tab each month; copied formulas drifted and caused wrong charges for several months.

**North star:** set up once, enter one number a month, tap to send, never touch a formula.

The app goes live for the November 2026 cycle. The v1 screens were designed on a design canvas, which is the source of truth for layout, copy and prototype flows; this brief records the rules and decisions behind it. The design phase is complete. Stack decisions are tracked in the Tech Stack doc, and anything not designed goes to v2 or an incremental v1 update.

## User and context

Francis is the only person who uses the app. Everyone else only receives WhatsApp messages from him, so v1 has no sharing or multi-user screens. Francis signs in with Google, because the app holds personal data.

| Person | Role | Uses the app? |
| --- | --- | --- |
| Francis | Pays the landlord and the utilities company upfront, collects everyone's share | Yes, sole user |
| Primary tenant | Pays their share and forwards Tenant 1's utilities share in one transfer | No, receives one combined message |
| Tenant 1 | Room 2; pays rent directly, utilities through the primary tenant | No |
| Tenant 2 | Subtenant, room 3 | No, receives their own message |

The household is a 4-room flat with 6 aircon units. Other household members live there but are not counted in any split.

Usage pattern: a few minutes around the 2nd of each month, plus quick check-ins on due dates, on his phone, usually one-handed.

## How the money works

Every split follows one pattern: fixed allocations come off first, and Francis and the primary tenant split the remainder 50/50 by default. Every split value here, including that 50/50, is an editable setting in the app, never hardcoded. The household setup from November 2026:

| Party | Room | Rent (SGD) | Utility shares | Aircon units | Pays through | Due |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant 1 | Room 2 | 950 | 1 of 5 | 1 | Rent direct; utilities via the primary tenant | Rent 28th, utilities 7th |
| Tenant 2 | Room 3 | 950, moved to savings | 1 of 5 | 1 | Direct | Rent 1st, utilities 4th |
| Primary tenant | Master | 1,675 | 1.5 of 5 | 2 | Direct | 7th |
| Francis | Master | 1,675 | 1.5 of 5 | 2 | n/a | n/a |

Rules the design must reflect:

- **Rent:** the landlord gets $4,300 on the 1st (room 2 $950 + master $3,350). Tenant 2's $950 is not landlord rent; it is income Francis moves to a second savings account.
- **Utilities:** the bill's Current Charges divided into 5 shares. Use Current Charges, not Total Amount Payable, which can include old balances.
- **Aircon servicing:** split per unit across 6 units (each room 1, living area 2). Usually $110 a quarter, booked ad hoc.
- **Rounding:** amounts in cents; Francis absorbs any leftover cent so shares always add up to the bill.
- **Effective dates:** rent, shares, split percentages, routes and recurring charges change from a chosen month onward; past months keep their values.
- **Deposit:** Tenant 2's $950 deposit is held, not income.

Four kinds of charges feed each person's next payment:

|  | Shared (split across people) | Personal (one person owes Francis) |
| --- | --- | --- |
| **Recurring** | Rent, utilities | Starhub mobile plan, primary tenant, $27.50/month |
| **One-off** | Aircon servicing, repairs | Purchases like Waltermart; corrections (+ or −) |

Corrections for a past month are one-off charges, positive or negative, linked to the month they fix.

## Monthly timeline and core flows

The month is driven by fixed dates that cannot change:

1. **1st:** Francis pays $4,300 rent to the landlord. Tenant 2 pays $950 rent, which Francis moves to savings.
2. **~2nd:** the utilities bill arrives. Francis uploads it; this triggers the month.
3. **4th:** Tenant 2 pays their utilities share.
4. **7th:** the primary tenant pays their rent, their utilities share, Starhub and any extras, plus Tenant 1's utilities share, in one transfer.
5. **16th:** the utilities bill is due (Francis has habitually paid around the 18th).
6. **28th:** Tenant 1 pays their $950 rent directly.

Core flows:

1. **Monthly bill:** upload PDF → app reads it → confirm amount → messages are ready. If reading fails: the app asks whether it is the right bill; if yes, the PDF is kept and Francis types the Current Charges amount and continues, and if no, the PDF is discarded and he picks another file.
2. **Send:** per recipient, preview the message, tap Send → WhatsApp opens in that chat with text ready. Optional Share bill opens Android's share sheet with the stored bill file.
3. **Collect:** mark a charge paid (amount editable). When a charge is due or overdue, Nudge opens WhatsApp with a reminder; the app records when it was nudged.
4. **Add a one-off charge:** shared or personal, amount (can be negative), split method, optional link to a past month as a correction. It lands on each person's next payment.
5. **Change the household:** add or remove a subtenant, change rent, shares, due dates or routes from a chosen month, with a preview of the new amounts before saving.
6. **Move Tenant 2's rent to savings:** marking their rent received creates a "transfer to savings" task for Francis.

## Screens

Seven core screens cover v1; Home carries most of the daily use. Screens added during design follow the table.

| Screen | What it shows and does | Key states |
| --- | --- | --- |
| Home (this month) | Charges ordered by due date with status; one primary action that changes with the month (Upload bill, then Record payment); rows expand to show Mark paid, Nudge, Mark bill paid and View bill; there is no bottom button while messages are unsent, since each message is reviewed from its row; amount Francis is fronting; utilities bill coverage (collected vs. bill) | Bill not uploaded; messages unsent; due today; overdue; all settled |
| Bill upload | Pick PDF; the file is read on the backend into a draft, then a review screen shows the file name, bill month, billing period, due date, Current Charges and electricity/gas/water lines, all editable, with a Choose another file link; nothing is stored until Save | Reading; read OK; read failed → right bill? → amount fields (file kept) or pick another file; billing period doesn't match the month; month already has a bill → Replace |
| Recipient | One person's message preview in sections (their lines, and for the primary tenant a separate Tenant 1 section) with subtotals; Send, Share bill, Nudge, Mark paid | Not sent; sent; nudged on date; paid; paid a different amount |
| Add charge | Bottom sheet: shared or personal, amount (+/−), split method (per share, per unit, custom), who, note, link to past month | Split preview; totals check |
| Household | Rooms and units, who occupies each, rent, utility shares and split percentages (including the remainder split between Francis and the primary tenant, e.g. 50/50 or 60/40, set separately for rent, utilities and aircon), due dates, payment route, WhatsApp number, deposit; add or remove subtenant | Editing with "starts from" month; preview of new amounts; validation errors (e.g. percentages not adding to 100%) |
| History | Past months with paid status; tap into a read-only month and its bill | Month corrected later; unpaid carried |
| Settings | Notification toggles; message templates with placeholders, per-person overrides, custom line labels and live preview; no payment details or PayNow stored in v1 | n/a |

Added during design:

| Screen | What it shows and does | States built |
| --- | --- | --- |
| View bill | Read-only: Current Charges with electricity, gas and water, how much is collected and each person's status, bill facts, and the PDF. Opened from Home's bill row; the only action is Mark bill paid while collecting | Collecting; paid |
| Mark bill paid (sheet) | Amount paid (prefilled), Paid on date, and a note on how much Francis is covering until others pay. Opens from Home and View bill | Collected less than the bill (warning alert); fully collected (success alert, green) |
| Mark paid and Record payment (sheets) | Mark paid: expected vs. received, editable amount, date, and, when the payment is short, the difference shown as information (no carry; the shortfall is history only). Record payment: From and For dropdowns for money received outside a row | Full; different amount; record; dropdowns open |
| Share bill (sheet) | Choose the bill PDF or a text summary (optionally with each person's share), then Android's share sheet. Opened from the Recipient screen only | PDF; summary; system share sheet |
| Notifications | Heads-up and shade matching the notification table below; Paid on a notification opens Record payment | Heads-up; shade |
| First-run setup | Checklist: Rent and rooms, People, Your split, Messages (optional) | Empty; in progress |
| Confirmations | Remove person, remove template version, discard changes. Filled Cancel, red outline destructive button | Three dialogs |

Also added in the gluestack v5 rewrite (Oct 14, 2026): Sign in with Google, a blocking Can't reach the server prompt with Retry (replacing the offline indicator), returning-user loading, loading and saving states, a leftover bill draft on Home, and a Turn on reminders step in first-run setup.

Backlog, not designed (each goes to v2 or an incremental v1 update): a blocking error when shares don't add up to the bill; sharing a bill in from the SP Group app, with its "Replace November's bill?" prompt (designed, moved out of v1); a message screen for Tenant 2's unsent utilities message.

## Notifications, messages, and copy

Notifications go to Francis only, each can be switched off, and tapping one opens the relevant screen. Nothing is ever sent to others automatically.

| Channel (Android) | When | Notification | Actions |
| --- | --- | --- | --- |
| Action needed (high, heads-up) | ~2nd, repeats daily until done | Upload this month's utilities bill | Opens bill upload |
| Action needed (high, heads-up) | Last working day before the 1st, if Tenant 1's rent is still unpaid (skips weekends, since bank transfers can be slow then) | Collect Tenant 1's rent | Paid · Nudge |
| Action needed (high, heads-up) | Tenant 2's rent marked received | Transfer $950 to savings | Opens the task |
| Action needed (high, heads-up) | Before the bill's due date | Pay utilities bill: collected $X of $Y | Opens Home |
| Payment check (default) | Each charge's due date, if unpaid | Dynamic: "Did {name} pay {charge}?", e.g. "Did Tenant 2 pay Nov utilities ($100.79)?" or "…Nov rent ($950)?" | Paid · Nudge |
| FYI (low, silent) | When triggered | Unusual bill amount · Aircon servicing due? · Month settled | None |

Messages must show the working so recipients can check them. Wording comes from editable templates, so messages can be in Taglish, Tagalog or English. Example for the primary tenant (sample November amounts):

```markdown
Nov 2026, payment due 7 Nov

Yours:
Rent $1,675.00
Utilities bill (1.5 of 5 shares of $412.30) $123.69
Starhub $27.50
Subtotal $1,826.19

Tenant 1's (please collect):
Utilities bill (1 of 5 shares) $82.46

Total: $1,908.65
```

Nudge example: "Hi Tenant 2! Just a gentle reminder — Nov rent of $950 was due on the 1st. Thanks!"

**Message templates are app parameters.** Francis edits them in-app with a live preview using sample data: one template per message type (monthly breakdown, nudge), optionally overridden per person, plus custom labels for each line (e.g. "Kuryente at tubig" instead of "Utilities bill"). Placeholders fill in the details, and templates follow the same "starts from" month rule as other settings. Example default:

```markdown
Hi {name}! Eto na yung breakdown for {month} 😊

{lines}

Total: {total}
Paki-send by {dueDate}. Salamat!
```

Nudge default: "Hi {name}! Paalala lang, yung {charge} for {month} ({amount}) ay due nung {dueDate}. Salamat! 🙏"

## Design constraints and out of scope

Constraints:

- Android app installed on Francis's phone, not published to the Play Store. The app shell is decided in the Tech Stack doc; follow Android conventions (back gesture, share sheet, bottom sheets) and design for one-handed use.
- Currency is SGD, always shown with 2 decimals.
- WhatsApp sends are text only, one tap per person via a prefilled chat. Attaching the bill is a separate manual Share bill step.
- Bill reading is PDF text extraction with no AI, run on the backend; the fallback is typed amounts, and a bill that can't be read never blocks the month.
- Single user: Google sign-in only; no sharing or role screens.
- Support light and dark themes.

Out of scope for v1:

- Read-only views for the primary tenant, Tenant 1 or Tenant 2
- Fully automatic WhatsApp sending or attachments inside messages
- AI bill reading
- Partial-payment carry-over (Francis edits the paid amount instead)
- Mid-month move-ins and proration

## Sample data for mockups (Nov 2026)

Use a sample utilities bill of $412.30 (one share = $82.46) and a $110 aircon servicing. The amounts are illustrative but internally consistent.

| Person | Rent | Utilities bill share | Aircon | Other | Total | Due |
| --- | --- | --- | --- | --- | --- | --- |
| Primary tenant | $1,675.00 | $123.69 | $36.67 | Starhub $27.50 | $1,862.86 | 7 Nov |
| Tenant 1 (via primary tenant) | n/a | $82.46 | $18.33 | n/a | $100.79 | 7 Nov |
| Tenant 1 rent | $950.00 | n/a | n/a | n/a | $950.00 | 28 Nov |
| Tenant 2 rent | $950.00 → savings | n/a | n/a | n/a | $950.00 | 1 Nov |
| Tenant 2 utilities | n/a | $82.46 | $18.33 | n/a | $100.79 | 4 Nov |
| Francis (own share) | $1,675.00 | $123.69 | $36.67 | n/a | n/a | n/a |

Checks: utilities bill shares add to $412.30, and aircon shares add to $110.00. Useful states to show: Tenant 2 rent overdue and nudged on 2 Nov; primary tenant's message sent but unpaid; Tenant 1 rent upcoming.

## Decisions made in design

These settled during design and override anything earlier in this brief that disagrees.

- **Messages are never sent automatically.** Francis reviews each message on its Recipient screen and sends it on WhatsApp himself. There is no send-all action. Send on WhatsApp, Send again and Nudge again leave the app by design.
- **Look and feel:** graphite neutral palette, Manrope, Lucide icons, light and dark themes. Errors and overdue (the Overdue badge and the Recipient status line) use standard danger red; warnings use orange. The overdue row on Home keeps the warning tint. Destructive dialogs have a filled Cancel and a red outline action. Fields are outlined with the label above (gluestack FormControl) and a neutral focus ring.
- **People:** the primary tenant is a named person in the app. Tenant 1 is modelled as a subtenant with a route per charge type, either Directly or Via someone. Phone fields default to Singapore (+65).
- **No payment details.** PayNow and similar are not stored in v1.
- **Tenant 2's rent to savings** is a notification task only; the app does not track the savings account.
- **Notifications** are a catalog of messages, not a dated schedule. Paid on a notification opens the Record payment sheet instead of marking paid directly.
- **Bills:** View bill is read-only. Marking the bill paid is a sheet with the amount and date, reached from Home. Share bill is reached from the Recipient screen. Bill upload is in-app only in v1 (share-in is deferred): the PDF is read on the backend into a draft that Francis reviews and edits, and Save stores it. A PDF that can't be read is kept only if Francis confirms it is the right bill, then he types the amounts.
- **Settings:** the "Applies to" choice is a dropdown. The nudge template is edited separately from the monthly breakdown template.

## Tech stack

Stack decisions, open questions and the suggested build order live in the Tech Stack doc (`SplitHouse — Tech Stack.md`). This brief stays the record of the design.
