# SplitHouse: design reference

This is the design reference for the coding agent working in this repo. It points at the approved design, says what to read, and sets the rules for turning it into code. It is not a spec to implement in one go.

## How to use this

1. The design is the source of truth for layout, copy, states and colour. Do not invent screens, states, wording or tokens. If something is missing or unclear, stop and ask the owner.
2. Work one screen (or one flow row below) at a time. For each: read its source component in `docs/design/source/`, build it with the gluestack component named in the mapping doc, wire its states, then stop for review.
3. Build every state listed for a screen, not only the happy path. Loading, saving, failed and empty states are part of the design.
4. Both themes are required. Colour comes only from the theme variables in `docs/design/config.ts` and `docs/design/global.css`. No hex values in screen code.
5. Behaviour, data and money rules come from the docs, not from the design: `Data Model`, `Tech Stack`, `Design Brief`, `Account Setup Guide`. The design only shows what the screens look like.

## What is in this folder

| Path | What it is |
|---|---|
| `docs/design/source/*.dc.html` | One file per screen component (18). Read them as markup (they need the design tool to render): the HTML gives exact spacing, sizes, copy and the token set `c` in the script block. They are a visual reference, not code to port line by line. |
| `docs/design/config.ts`, `docs/design/global.css` | NativeWind and gluestack v5 theme variables, light and dark. Copy into the app's gluestack provider config and global CSS. |
| `docs/Rent & Utils — gluestack v5 theme and screen mapping.md` | Token names, which gluestack component each part of each screen uses, and what is custom. |
| Design canvas (private, owner only) | https://claude.ai/artifact/Lknba8Qamp5n3N7BLMNuQe. The agent cannot open it. Ask the owner for a screenshot of a board when the source file is not enough. |

## How the source components work

Each file renders one phone screen (400 x 848 px) and takes two props:

- `theme`: `light` or `dark`.
- A state prop, which differs per component (`state`, `step`, `mode`, `kind`, `view`, `collected`), plus `save` on screens with a save action (`idle`, `saving`, `failed`).

The canvas boards are the same component with different props. The tables below list every board in the Light set, the component it uses and the props. The Dark set is identical with `theme=dark`.

## Rules that are easy to get wrong

- Status colours (success, warning, danger) keep the MUI values from the old design. They are in the theme variables already.
- Success alert (gluestack `Alert`, success variant): only on Mark bill paid, fully collected ("All $412.30 is collected..."). Tinted background (`success-tint`), `success-line` border, `success` check icon, `on-success-container` text. Alert text is tinted per variant (info, warning, success, error), not neutral. The partial-collected note stays a warning alert. Status chips such as Paid are unchanged.
- Overdue is an error badge: `danger-container` background with `on-danger-container` text, on Home, Recipient and the Can't reach the server backdrop. Recipient's "Rent overdue since..." status line is `danger`. The overdue row's background tint on Home stays the warning tint. Due today and Due tomorrow stay info.
- The big day number in every Home charge row uses `on-surface`, whatever the status.
- gluestack v5 has no segmented control, chip or bottom navigation. These are custom pieces: the bottom navigation bar, the segmented controls, the chips, and the Google sign-in button.
- Every field is a `FormControl` with the label above the field and helper or error text below. No floating labels. See the Form controls row.
- Month-only fields (bill month, Starts from) are Select-style lists. The date picker has no month-only mode. Date fields use the native picker.
- Amounts are integer cents, SGD only. See the Data Model doc for rounding.
- Messages are never sent automatically. Every send is one tap per person, opening a prefilled WhatsApp chat.
- The app has one user. Names in the design are placeholders: Primary Tenant, Tenant 1, Tenant 2. The real labels come from household data, never hard-coded.
- Android only. Use Android conventions: back gesture, system share sheet, system notification channels.

## Suggested build order

Not a plan the agent should follow on its own. The owner decides what to build next.

1. Theme, provider and the shared pieces (bottom navigation, `FormControl` wrapper, Alert, Button, Spinner).
2. Sign in and session: Sign in (5 states), Returning user, Server error.
3. First run (Welcome), then Household.
4. Home, then Bill upload, View bill, Mark bill paid.
5. Recipient, Share, Payments (Mark paid, Record payment), Add charge, History.
6. Settings, Notifications, Confirmations.

## Screens and states

Component and props are what to pass to the source file in `docs/design/source/` to see that board.

### Sign in & session

| Board | Component | Props |
|---|---|---|
| Sign in · Signed out | `SignIn` | `state=out` |
| Sign in · Signing in | `SignIn` | `state=signing` |
| Returning user · Loading your data | `Returning` | defaults |
| Sign in · Sign-in failed | `SignIn` | `state=failed` |
| Sign in · Account not allowed | `SignIn` | `state=notAllowed` |
| Sign in · Session ended | `SignIn` | `state=ended` |
| Can’t reach the server | `ServerError` | `state=idle` |
| Can’t reach the server · Retrying | `ServerError` | `state=retrying` |

### First run — setting up the household

| Board | Component | Props |
|---|---|---|
| First run · Nothing set up | `Welcome` | `state=empty` |
| First run · Partly set up | `Welcome` | `state=progress` |
| First run · Turn on reminders | `Welcome` | `state=notifications` |

### Home — this month (Nov 2026)

| Board | Component | Props |
|---|---|---|
| Home · Loading | `Main` | `state=loading` |
| Home · Bill not uploaded | `Main` | `state=upload` |
| Home · Bill in, messages not sent | `Main` | `state=unsent` |
| Home · Tenant 2 rent overdue, nudged | `Main` | `state=collecting` |
| Home · Tenant 2 utilities due today | `Main` | `state=dueToday` |
| Home · All settled | `Main` | `state=settled` |
| Home · Unfinished bill draft | `Main` | `state=draft` |

### Bill upload — PDF → reading → review → save, Nov 2026

| Board | Component | Props |
|---|---|---|
| Bill upload · Pick PDF | `BillUpload` | `step=pick` |
| Bill upload · Reading | `BillUpload` | `step=reading` |
| Bill upload · Review | `BillUpload` | `step=review` |
| Bill upload · Discard draft? | `BillUpload` | `step=discard` |
| Bill upload · Review · period mismatch | `BillUpload` | `step=period` |
| Bill upload · Review · lines don’t add up | `BillUpload` | `step=sum` |
| Bill upload · Save with warnings? | `BillUpload` | `step=confirm` |
| Bill upload · Review · some lines missing | `BillUpload` | `step=partial` |
| Bill upload · Add a line | `BillUpload` | `step=addLine` |
| Bill upload · Review · no lines found | `BillUpload` | `step=noLines` |
| Bill upload · Reading → fails | `BillUpload` | `step=readingFail` |
| Bill upload · Read failed · Is this the right bill? | `BillUpload` | `step=failed` |
| Bill upload · Review · couldn’t read PDF | `BillUpload` | `step=unread` |

### View bill, share & mark bill paid — Nov 2026

| Board | Component | Props |
|---|---|---|
| View bill · Loading | `Bill` | `state=loading` |
| View bill · Collecting | `Bill` | `state=collecting` |
| Mark bill paid sheet · Collected less than the bill | `PayBill` | `collected=partial` |
| Mark bill paid sheet · Fully collected | `PayBill` | `collected=full` |
| View bill · Paid | `Bill` | `state=paid` |
| Mark bill paid sheet · Saving | `PayBill` | `collected=partial`, `save=saving` |
| Mark bill paid sheet · Failed save | `PayBill` | `collected=partial`, `save=failed` |
| Share bill · Bill PDF | `Share` | `state=pdf` |
| Share bill · Summary | `Share` | `state=summary` |
| Share bill · System share sheet | `Share` | `state=system` |

### Recipient — message preview & collect

| Board | Component | Props |
|---|---|---|
| Recipient · Primary Tenant, not sent | `Recipient` | `state=notSent` |
| Recipient · Primary Tenant, sent unpaid | `Recipient` | `state=sent` |
| Recipient · Primary Tenant, paid | `Recipient` | `state=paid` |
| Recipient · Primary Tenant, paid a different amount | `Recipient` | `state=paidDifferent` |
| Recipient · Tenant 2, nudged 2 Nov | `Recipient` | `state=nudged` |

### Payments — mark paid & record payment

| Board | Component | Props |
|---|---|---|
| Mark paid · Full amount | `MarkPaid` | `state=full`, `save=idle` |
| Mark paid · Different amount | `MarkPaid` | `state=different` |
| Mark paid · Different amount · Saving | `MarkPaid` | `state=different`, `save=saving` |
| Mark paid · Different amount · Failed save | `MarkPaid` | `state=different`, `save=failed` |
| Record payment · Tenant 2 picked | `MarkPaid` | `state=record` |
| Record payment · From dropdown open | `MarkPaid` | `state=recordOpen` |
| Record payment · For dropdown open | `MarkPaid` | `state=recordForOpen` |
| Record payment · Saving | `MarkPaid` | `state=record`, `save=saving` |
| Record payment · Failed save | `MarkPaid` | `state=record`, `save=failed` |

### Add charge — bottom sheet

| Board | Component | Props |
|---|---|---|
| Add charge · Shared, per unit | `AddCharge` | `mode=shared`, `save=idle` |
| Add charge · Personal correction | `AddCharge` | `mode=correction` |
| Add charge · Custom split doesn't add up | `AddCharge` | `mode=error` |
| Add charge · Saving | `AddCharge` | `mode=shared`, `save=saving` |
| Add charge · Failed save | `AddCharge` | `mode=shared`, `save=failed` |

### History — past months (viewed Feb 2027)

| Board | Component | Props |
|---|---|---|
| History · Loading | `History` | `state=loading` |
| History · Months | `History` | `state=list` |
| History · Nov 2026, corrected later | `History` | `state=monthCorrected` |
| History · Dec 2026, unpaid carried | `History` | `state=monthCarried` *(Not built in v1, deferred.)* |

### Household — rooms, people & splits

| Board | Component | Props |
|---|---|---|
| Household · Loading | `Household` | `state=loading` |
| Household · Overview | `Household` | `state=view` |
| Household · Edit Tenant 2 from Jan 2027, preview | `Household` | `state=editPerson` |
| Household · Split doesn't add to 100% | `Household` | `state=splitError` |
| Household · Edit Primary Tenant, rename | `Household` | `state=editPrimary` |
| Household · Edit Tenant 1 | `Household` | `state=editTenant1` |
| Household · Edit landlord rent from Jan 2027 | `Household` | `state=editHome` |
| Household · Add subtenant (empty) | `Household` | `state=addPerson` |

### Settings — account, appearance, messages, notifications

| Board | Component | Props |
|---|---|---|
| Settings · Overview | `Settings` | `state=view` |
| Settings · Monthly breakdown template | `Settings` | `state=template` |
| Settings · Tenant 2's own template | `Settings` | `state=override` |
| Settings · Nudge template | `Settings` | `state=nudge` |
| Settings · Notifications blocked | `Settings` | `state=blocked` |

### Notifications — Android system UI, copy / channel / actions / icon reference

| Board | Component | Props |
|---|---|---|
| Notification · Heads-up, SP bill | `Notifications` | `state=headsUp` |
| Notification · Shade, all types | `Notifications` | `state=shade` |

### Confirmations — destructive actions

| Board | Component | Props |
|---|---|---|
| Confirm · Remove from household | `Confirm` | `kind=removePerson` |
| Confirm · Remove template version | `Confirm` | `kind=removeVersion` |
| Confirm · Discard unsaved changes | `Confirm` | `kind=discard` |

### Form controls — one FormControl pattern for every field

| Board | Component | Props |
|---|---|---|
| Form controls · Fields | `FormControls` | `view=fields` |
| Form controls · Pickers | `FormControls` | `view=pickers` |
| View bill | `Bill` | `state=collecting` |
| Form controls | `FormControls` | `view=fields` |
| Notifications | `Notifications` | `state=shade` |
| Mark bill paid — sheet | `PayBill` | `collected=partial`, `save=idle` |
| Returning user, loading | `Returning` | defaults |
| Can’t reach the server | `Main` | `state=collecting` |
| Share bill — sheet | `Share` | `state=pdf` |
| Sign in | `SignIn` | `state=out` |

## Not covered by the design

- Anything not listed above, including a "shared in" bill intake path. That design was removed from v1.
- Real data, copy for languages other than English, and tablet or landscape layouts.
- The designs were never rendered on a device. Expect to nudge spacing, especially on the taller label-above forms and the Settings "notifications blocked" state.
