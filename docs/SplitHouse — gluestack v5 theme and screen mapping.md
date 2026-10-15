# SplitHouse — gluestack v5 theme and screen mapping

Oct 14, 2026 · @Francis

## What was delivered

Every v1 screen is redrawn for gluestack-ui v5 (NativeWind) in light and dark, with the theme below and the new screens the handover lists. Layout, copy, flows and the November 2026 sample data are unchanged.

- **Screens:** the gluestack canvas keeps the current canvas's layout, with a Light set and a Dark set side by side and one row per flow. The v1 canvas is untouched.
- **Fields:** floating labels are gone. Every input, select, date field and textarea is a FormControl with the label above, plus helper and error text. The Form controls row on the canvas shows all states once.
- **New screens and states:** Sign in (signed out, signing in, sign-in failed, account not allowed, session ended), Settings account row, Can't reach the server (Retry), loading skeletons for Home, History, View bill and Household, saving and failed-save states for Add charge, Mark paid, Record payment and Mark bill paid, the notification permission step and the blocked state, returning-user loading, and the leftover bill draft on Home.
- **Theme tokens and mapping:** the sections below.

## Colour tokens

The handover's twelve semantic names are the tokens. The third column says which gluestack v5 variable each one drives, since v5's defaults are shadcn-style (background, foreground, card, muted, accent, destructive, border, input, ring) and have no success, warning or info. Status colours keep the MUI values already used on the v1 canvas, as agreed; `destructive` is set to the danger value instead of v5's default #e7000b.

| Token | Drives in gluestack v5 | Light | Dark | Used for |
| --- | --- | --- | --- | --- |
| background | background | #F5F5F7 | #111214 | Screen background |
| surface | card | #FFFFFF | #1A1C1E | Cards, list rows, field fill |
| container | muted, secondary | #E9EAED | #222427 | Nav bar, neutral badges, skeleton |
| sheet | popover | #FFFFFF | #222427 | Bottom sheets, dialogs, menus |
| on-surface | foreground, card-foreground | #1A1C1E | #E3E3E6 | Primary text and icons |
| on-surface-variant | muted-foreground | #45484C | #C4C6CB | Secondary text, helper text |
| outline | input | #74777C | #8E9196 | Field and outline-button borders |
| outline-variant | border | #E6E7EA | #2E3134 | Dividers, card edges |
| primary | primary | #2B2F33 | #E2E2E6 | Solid buttons, focus border |
| on-primary | primary-foreground | #FFFFFF | #1A1C1E | Text on primary |
| selected | accent | #E6E7EA | #2C2F33 | Selected chip, segment, row |
| on-selected | accent-foreground | #1A1C1E | #E3E3E6 | Text on selected |
| disabled / on-disabled | custom | #E9EAED / #9A9DA2 | #222427 / #5C5F64 | Disabled fill / disabled text |
| track | custom | #D3D5D9 | #3A3E43 | Progress tracks, sheet grabber |
| scrim | custom | rgba(0,0,0,0.5) | rgba(0,0,0,0.6) | Behind sheets and dialogs |
| success | custom | #2E7D32 | #66BB6A | Success icon and text |
| success-container / on | custom | #C8E6C9 / #1E4620 | #1B5E20 / #CBE4CB | Paid badge |
| warning | custom | #E65100 | #FFA726 | Overdue, non-blocking warnings |
| warning-container / on | custom | #FBE2CC / #663C00 | #66430F / #FFE2B7 | Warning badge, Nudge button |
| warning-tint / line | custom | #FFF4E5 / #FBE2CC | #332108 / #F57C00 | Warning alert card |
| danger | destructive | #D32F2F | #F44336 | Errors, blocking states, destructive action |
| danger-tint / line | custom | #FDEDED / #F6D5D5 | #3B1511 / #D32F2F | Danger alert card |
| on-danger-tint | custom | #5F2120 | #FFD9D6 | Text on danger tint |
| info | custom | #0288D1 | #29B6F6 | Notes, due-today |
| info-tint / line | custom | #E5F6FD / #CCE7F6 | #082431 / #1B76A0 | Info alert card |
| info-container / on | custom | #CCE7F6 / #014361 | #104962 / #B8E7FB | Info badge |
| ring | ring | primary | primary | Focus ring (neutral) |

## Type, shape, spacing, elevation, icons

Manrope throughout, loaded with weights 400 to 800. Amounts use tabular numerals. Sizes are px; line height follows the slash.

| Role | Size / line | Weight | Used for |
| --- | --- | --- | --- |
| Hero amount | 34 / 40 | 800 | Home hero total |
| Page title | 24 / 32 | 800 | Home, History, Household, Settings, Sign in |
| Sheet title | 20 / 28 | 800 | Sheets, dialogs, back-arrow screens |
| Amount | 20 / 28 | 800 | Row and card amounts |
| Field text | 16 / 24 | 500 | Input, select, date, textarea values |
| Body | 15 / 22 | 500 | Paragraphs, intros |
| Label | 14 / 20 | 700 | FormControl labels, button text at 15 / 20 |
| Caption | 12 / 16 | 600 | Helper and error text, badges, metadata |

| Shape | Radius |
| --- | --- |
| Field (Input, Select, Textarea) | 12 |
| Button, Badge, chip, segmented control | full (pill) |
| Card | 20 |
| Alert | 16 |
| Bottom sheet | 28 top corners |
| AlertDialog | 24 |
| Phone mock frame | 18 inside a 26 outer |

| Spacing and touch | Value |
| --- | --- |
| Steps | 4, 8, 12, 16, 20, 24, 32 |
| Screen gutter | 16 |
| Gap between FormControls | 16 |
| Label to field, field to helper | 6 |
| Minimum touch target | 44 |
| Buttons and fields | 48 high (small buttons 44) |

| Elevation | Treatment |
| --- | --- |
| Footers and bottom nav above content | 0 -6px 14px rgba(0,0,0,0.14) light, 0 -8px 16px rgba(0,0,0,0.45) dark |
| Bottom sheets and dialogs | None. The scrim shows depth |
| Cards, menus | Flat. Menus get a 1px outline-variant border |

Icons are Lucide, stroke 2, drawn inline. By action:

| Action | Lucide name |
| --- | --- |
| Back | arrow-left |
| Add a line, add person | plus |
| Close | x |
| Date field | calendar |
| Select and month field | chevron-down |
| Open a row | chevron-right |
| Done, selected, paid | check, circle-check |
| Blocking error | circle-alert |
| Warning | triangle-alert |
| Note | info |
| Discard, delete | trash-2 |
| Nudge, reminders | bell |
| Send on WhatsApp | send |
| Open system settings | external-link |
| Server unreachable | cloud-off |
| Bottom navigation | house, history, users, settings |

## NativeWind and gluestack config

The tokens above are delivered as two files that drop into a gluestack v5 project: `gluestack-ui-provider/config.ts` (light and dark variable sets) and `global.css` (Tailwind theme mapping, type and radii). Both were written from the tables in this doc, so the tables and files agree.

- **config.ts:** each theme is a `vars({...})` set of space-separated RGB triplets, as gluestack v5 documents, so `bg-primary/50` works. The first 18 entries override gluestack's own variables (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring). The rest are the app tokens: surface, container, sheet, on-surface, outline, selected, disabled, track, scrim, success, warning, danger, info and their tint, line and container variants.
- **global.css:** an `@theme inline` block maps every variable to a Tailwind colour (`bg-surface`, `text-on-surface-variant`, `border-outline-variant`, `bg-danger-tint`) and adds the Manrope family, the type sizes above and the radii (`rounded-field`, `rounded-card`, `rounded-sheet`).
- **Usage pattern:** screens use only token classes, never hex. A danger Alert is `bg-danger-tint border border-danger-line text-on-danger-tint`; a disabled button is `bg-disabled text-on-disabled`; a Paid badge is `bg-success-container text-on-success-container`.

```ts
// gluestack-ui-provider/config.ts (excerpt; the full file has all 49 variables per theme)
export const config = {
  light: vars({ '--background': '245 245 247', '--surface': '255 255 255', '--primary': '43 47 51', '--danger': '211 47 47', /* ... */ }),
  dark: vars({ '--background': '17 18 20', '--surface': '26 28 30', '--primary': '226 226 230', '--danger': '244 67 54', /* ... */ }),
};
```

Not yet verified, as the handover warned: the file layout above follows gluestack's v5 theme docs but has not been run in a build, and Manrope (five weights through the Expo font loader) and Lucide (lucide-react-native with NativeWind class support) in this setup still need a first-run check.

## Screen-to-component mapping (corrected)

Checked against gluestack v5's component list. Custom pieces are marked **custom**; v5 has no segmented control, chip or bottom navigation bar.

| Screen | gluestack components | Custom pieces | What changed from the draft |
| --- | --- | --- | --- |
| Home | Card, Pressable, Badge, Progress, Button, Accordion, Alert, Skeleton | Bottom navigation bar (**custom**, built on a restyled Tabs) | FAB removed: the canvas has none. Alert added for the leftover draft |
| Bill upload | FormControl, Input, Select (Bill month, as a month list), DateTimePicker (Due date, Billing period), Button, Spinner, Alert, AlertDialog (Discard, Save with warnings) | File picker, number pad (**custom**; the number pad only mocks Android's decimal keyboard and is not built) | "Is this the right bill?" is a screen of Card, Alert and Buttons, not an AlertDialog |
| Recipient | Card, Divider, Badge, Button | Message preview formatting (**custom**) | None |
| Add charge | BottomSheet, FormControl, Input, Switch, Select (Month being fixed, as a month list), Alert, Button, Spinner | Segmented control: Shared or Personal (**custom**); single-select chips: split method, Who (**custom**) | Alert added for the custom split that doesn't add up. Saving and failed-save states |
| Mark paid, Record payment, Mark bill paid | BottomSheet, FormControl, Input, Select (From, For), DateTimePicker (Received on, Paid on), Radio (carry or let go), Alert, Button, Spinner | None | Saving and failed-save states |
| Share bill | BottomSheet, Radio, Switch, Button | None. The system share sheet is Android's | None |
| View bill | Card, Badge, Progress, Button, Skeleton | PDF viewer (**custom**, opened from the Open row) | Loading state |
| Household | Card, FormControl, Input, Select (Applies to), Select (Starts from, as a month list), Switch, Alert, Progress, Skeleton | Segmented control: Directly or Via someone (**custom**); country-code prefix inside the WhatsApp field (**custom**); the two-segment 50/50 split bar (**custom** Progress) | Loading state. Required markers added |
| History | Card, Badge, Alert (month banner), Skeleton | Bottom navigation bar (**custom**) | Loading state |
| Settings | Card, Switch, FormControl, Textarea (templates), Select (Applies to), Badge, Alert, Button | Segmented controls: theme, preview sample (**custom**); message preview card (**custom**) | Account card with Sign out. Notifications-blocked state |
| First-run setup | Card, Progress, Button | Four-segment step indicator (**custom** Progress) | New step: Turn on reminders |
| Sign in | Alert, Spinner | Sign in with Google button in Google's own styling (**custom**) | New |
| Can't reach the server | AlertDialog, Button, Spinner | None | New |
| Returning user loading | Card, Spinner | None | New |
| Confirmations | AlertDialog, Button (filled Cancel, red outline action) | None | None |
| Notifications | System UI. Copy, channel, actions and icon only | Not drawn in the app | The boards are a reference for the Android notification text |
| Form controls (reference) | FormControl, Input, Textarea, Select, DateTimePicker | None | New reference boards |

Date fields use gluestack's DateTimePicker as provided. v5's picker has date, time and datetime modes and no month-only mode, so month-only fields are a Select-style list.

## Changes from the brief and open points

No flow or rule changed. Four places where copy or structure moved, and what to check:

- **First-run setup:** the checklist went from three steps to four, with a new optional "Reminders" row. Its detail line ("A heads-up on bill day and when a payment is overdue") is new copy, and the indicator now reads "2 of 4 steps done".
- **Current Charges (Bill upload):** the large 24px amount became the standard 48px field with a label above, as the FormControl rule requires. The required marker and helper text ("Required. The split uses this number.") are unchanged.
- **Save with warnings?:** "Save anyway" is a neutral outline button, not red, because saving with warnings is not destructive. "Go back and fix" is the filled primary.
- **Visual sizes:** buttons went from 52 to 48 high and Home's hero cards from radius 24 to 20, to match the type and shape scale.

Open points:

- **Not rendered.** Nothing was previewed or checked visually. The taller label-above forms (Mark paid with a different amount, the failed-save sheets) may need a layout nudge, and the Settings blocked state is pre-scrolled by an estimated offset.
- **Review messages boards** existed as files but were not on the v1 canvas, so they were not redrawn.
- **Handover wording:** parts of the handover say "Paper"; I treated that as gluestack.
- **Accordion rows on Home** use the same structure as v1 and are marked for gluestack's Accordion; the expand behaviour is a prototype toggle.
- **Sign out** has no confirmation dialog, as the handover specifies none.
- **New copy** on the new screens (Sign in, Can't reach the server, returning-user loading, leftover draft, notifications step, blocked state) follows the handover's wording where it gave one and is mine otherwise. Worth a read-through.
