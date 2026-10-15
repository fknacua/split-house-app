# SplitHouse — Tech Stack

Oct 3, 2026 · Updated Oct 15, 2026 · @Francis

## Status and purpose

The design phase is done, so this doc is where the tech stack gets defined before build work. The [Design Brief](https://claude.ai/code/artifact/5980dc1f-41a4-41c4-a404-1eebcb6fb2e9) holds the rules, screens and decisions the stack has to serve. The gluestack v5 rewrite of every screen was delivered on Oct 14, 2026 (see the theme and screen mapping doc), and the data model is in its own doc, SplitHouse — Data Model (Oct 15, 2026).

Anything the design did not cover goes to v2 or to an incremental update on v1. The solution architect review was skipped. Next are project setup and the build.

Oct 15 update: backend framework, database provider and auth library are settled, and the Sessions and sign-in section is rewritten for Better Auth.

## Decided

These decisions are settled; the few left for build time are at the end.

- **Data layer:** Postgres accessed through Prisma, behind a backend API. Money is stored in integer cents.
- **Sign-in:** Google sign-in (SSO). Francis is the only user, and the backend accepts only his Google account. See Sessions and sign-in below.
- **Bill reading:** PDF text extraction with unpdf, no AI, run on the backend after basic checks on the device. It was tested on a real bill and works. A typed amount is the fallback, and a bill that can't be read never blocks the month.
- **Bill files:** each bill stores one file, the PDF, plus a flag for whether parsing worked so the amount can be validated. Files are stored as bytes in the database, with no separate storage service. A PDF that fails parsing is not kept unless Francis confirms it is the right bill; if he does, the file is kept with a not-parsed flag and he types the amounts; if not, it is discarded. Share bill sends whatever file is stored. Storing files is wanted but can be dropped if it costs too much. A bill can also be entered by hand with no file at all.
- **Bill intake:** Francis uploads the PDF inside the app, from the month's screen; if that month already has a bill, the screen offers Replace. Sharing a bill in from the SP Group app (Android share menu) is out of v1 and can be revisited later.
- **WhatsApp:** text-only prefilled chats through wa.me links. No WhatsApp Business API.
- **Approach:** prefer the industry-standard choice over novelty.
- **App shell:** Expo (React Native), installed as a sideloaded Android APK. Every screen is written with View, Text and Pressable, with no HTML, CSS or DOM. Francis chose it partly to learn React Native.
- **Architecture and host:** the phone talks only to a backend API on Vercel Hobby, which talks to managed Postgres on a free tier (Neon). Redis is dropped. See Architecture below.
- **UI library:** gluestack-ui (v5), copy-in components styled with NativeWind (Tailwind classes), so Francis owns the component code. See UI library below.
- **Offline behaviour:** online-only. If the backend can't be reached, the app shows a prompt with Retry. Read-only offline viewing can be added later.
- **Reminder timing:** normal scheduling, accepting that Android may deliver a reminder late. No exact-alarm permission in v1; revisit if it causes problems in real use.
- **New phone and backups:** all data lives on the server, so a new phone needs only install and sign in. No in-app export in v1.
- **Backend framework:** Next.js route handlers on Vercel.
- **Database provider:** Neon, free plan (Postgres).
- **Auth library:** Better Auth, with Google sign-in and a rolling server-side session. It replaces the earlier access-token and refresh-token design. See Sessions and sign-in.
- **Data model:** in the Data Model doc. Household settings are versioned by starts-from month, charge amounts are saved when created, and payments are paid fields on the charge.

## Bill upload

Francis uploads the bill inside the app and reviews what was read before anything is saved. The backend does the reading.

1. On the month's screen, Francis taps Upload bill and picks the PDF. The device checks it is a PDF within a size limit, then sends it to the backend, which repeats the checks.
2. The backend stores the file in a draft, reads it with unpdf and returns the values.
3. A review screen shows the file name and the values (or an empty form if reading failed), all editable, with a Choose another file link. Nothing is saved until Save.
4. Save moves the draft into the real bill in one transaction, so the file is uploaded only once.

- **If reading fails:** the app asks whether it is the right bill. Yes: the file is kept with a not-parsed flag and Francis types the amounts. No: the draft is deleted and he picks another file. A bill can also be entered with no file.
- **Drafts:** one draft per month, and a new upload replaces it. Each draft has an `expiresAt` column that is filled in but not enforced in v1, kept as a mechanism for later; the 15-minute expiry timer is shelved. A draft is deleted when it is promoted, when Francis answers wrong bill or cancels, and by a lazy purge that runs whenever a draft is promoted or a new one is uploaded.
- **File storage:** bytes in a database table, because another subscription isn't wanted. Reads and writes sit behind a small storage interface (save, get, delete), so object storage could replace it later. Lists of bills never load the file bytes.
- **Parser:** unpdf only turns the PDF into text. A provider-neutral interface takes that text and returns the bill fields, or nothing. v1 has one SP Group implementation, so a new utility company or flat means a new implementation, not an app change. Francis will test the parser heavily on real bills during development.
- **Parser output:** follows the Design Brief. Current Charges in integer cents is required, since it is the only number the split uses. Bill month, billing period and due date are expected. The electricity, gas and water lines are best-effort, stored as a list of label and amount so a provider with different lines still fits, and kept for the View bill screen and possible analytics. A read that finds the lines but not Current Charges counts as failed.
- **Backend checks:** the file is a PDF within the size limit, amounts parse as money, the billing period matches the month being uploaded to, and Current Charges is not far off recent months. The lines adding up to Current Charges starts as a warning on the review screen. It becomes a hard check only if it holds across real bills, since GST or adjustments may sit outside the lines.
- **To confirm in design:** with no expiry enforced, a draft can still be there when Francis comes back, so the month's screen should offer to continue or discard it.

## Architecture and hosting

The Expo app talks to a backend API on Vercel, which talks to managed Postgres. The phone never reaches the database, so no database credentials ship in the APK.

- **Backend:** verifies the Google token, issues its own session tokens, runs Prisma queries and parses bill PDFs with unpdf.
- **Vercel Hobby:** free, meant for personal non-commercial use, and enough for one user. Going over limits blocks the feature rather than billing.
- **Git:** Vercel Hobby can't connect to repositories owned by a Git organization, so keep the backend repo under a personal GitHub account.
- **Database:** Neon Postgres, not Redis. The data is relational and history-sensitive, Prisma doesn't support Redis, and there is nothing to cache.
- **Connections:** use the provider's pooled connection string, because serverless functions open many short-lived connections.
- **Backups:** the database is the only copy of the data, including stored bill files. Neon's free plan has a 6-hour restore window and one manual snapshot, which is not a real backup. Run a scheduled `pg_dump` (for example a weekly GitHub Actions job). The dump holds personal data and bill files, so where it is stored still needs choosing.
- **Limits:** Neon free is 1 GB of storage per project and 100 compute hours a month, which is plenty for one user and a PDF a month.
- **Idle pause:** Neon's free compute scales to zero after 5 minutes idle and this cannot be turned off, so most launches start with a cold database. Treat "can't reach the server" as a general error state with Retry, not only a no-internet check.

## Sessions and sign-in

Google's token only proves identity, so Better Auth turns it into the app's own session.

1. Francis signs in with Google once.
2. The backend verifies the Google token, checks it is the allowed account, and creates a server-side session stored in Postgres.
3. The app keeps the session token in secure storage (Android Keystore, through expo-secure-store).
4. The session rolls: each use extends it, so Francis stays signed in as long as he opens the app within the window, like a Google app rather than Slack. Suggested window: 90 days of inactivity (Better Auth `expiresIn` of 90 days with an `updateAge` of 1 day).

There are no separate access and refresh tokens. This replaces the earlier design.

- **Account restriction:** only Francis's Google email may sign in, checked on the backend against a configured value.
- **Revocation, v1:** signing in on a new phone revokes all other sessions automatically (`revokeOtherSessions`). In an emergency, delete the session row in Neon's console or Prisma Studio. Because the session is checked in the database on each request, a revoked phone stops working at once. Keep Better Auth's cookie caching off, since a cache would let a revoked session live on.
- **Revocation, v2:** a signed-in devices list and "Sign out everywhere" in Settings, using `listSessions` and `revokeSession`.
- **No app lock** (fingerprint or PIN) in v1.
- **To verify in the spike:** Better Auth's Expo integration with secure storage and Google sign-in in a development build, and the email restriction.

## Requirements from the design

The design puts six requirements on the stack, whichever one is chosen.

- **One home for split rules:** the old sheet failed because copied formulas drifted, so every split calculation lives in one place and is versioned.
- **Money in integer cents:** SGD only. Francis absorbs any leftover cent so shares always add up to the bill.
- **Effective dates:** rent, shares, split percentages, payment routes and message templates apply from a chosen month, and past months keep their values. This needs versioned or snapshotted records.
- **Corrections as charges:** a fix to a past month is a one-off charge, positive or negative, linked to that month.
- **WhatsApp limits:** the app cannot tell whether a message was sent, so it records when a message was opened or nudged. Nothing is ever sent automatically.
- **Test data:** the sample November 2026 data doubles as seed and test data. Its checks become unit tests: the utilities shares add to the bill, and the aircon shares add to $110.00.

The data model that serves these is in the Data Model doc.

## Notifications

The design calls for three Android channels with their own importance levels, action buttons on some notifications, and a tap that opens a specific screen. A native Expo app can do all three, which a PWA with web push could not.

| Notification | Channel | Trigger | Actions |
| --- | --- | --- | --- |
| Upload this month's utilities bill | Action needed (heads-up) | About the 2nd, repeats daily until done | Opens bill upload |
| Collect Tenant 1's rent | Action needed (heads-up) | Last working day before the 1st, if unpaid | Paid, Nudge |
| Transfer $950 to savings | Action needed (heads-up) | Tenant 2's rent marked received | Opens the task |
| Pay utilities bill: collected $X of $Y | Action needed (heads-up) | Before the bill's due date | Opens Home |
| Did {name} pay {charge}? | Payment checks | Each charge's due date, if unpaid | Paid, Nudge |
| Unusual bill, aircon servicing due, month settled | FYI (silent) | When triggered | None |

What this means for the build, using local notifications scheduled on the phone (to confirm against the plugin's docs):

- **Date-based** notifications are scheduled ahead and recomputed whenever data changes, such as a new bill, a recorded payment or an edited due date.
- **Event-based** notifications fire immediately from Francis's own actions in the app.
- **Live amounts** like "collected $X of $Y" are fixed when scheduled, so each recorded payment reschedules that notification.
- **Permissions:** Android 13 and later asks for notification permission at runtime, and no exact-alarm permission is requested in v1, so reminders may arrive late.
- **Paid** opens the Record payment sheet and **Nudge** opens WhatsApp, so both actions bring the app to the foreground.
- **Reschedule on sign-in and launch:** scheduled notifications live on the device and do not carry over to a new phone, so the app rebuilds the schedule on every sign-in and launch. Otherwise a fresh install has no reminders.
- **Expo builds:** channels and action buttons likely need a development build rather than Expo Go. Confirm when setting up the project.

## New phone

1. Install the APK, kept somewhere downloadable such as an EAS build page or a GitHub release. Android will ask to allow installs from that source.
2. Sign in with the same Google account. The backend returns the data and revokes the old phone's session.
3. Allow notifications. The app recreates the three channels and reschedules every reminder.

## UI library

gluestack-ui (v5) is the UI library. Its components are copied into the repository and styled with NativeWind (Tailwind classes), so Francis owns the code and can restyle anything to his own graphite design, which is inspired by MUI. The official gluestack agent skill for v5 helps Claude Code build with it.

- **Covered by gluestack:** Bottom Sheet (React Native and Expo only) and Actionsheet, Select, Menu, Popover, AlertDialog, Modal, Alert, Input, Textarea, Switch, Radio, Checkbox, Toast, Progress, Spinner, Skeleton, Accordion, FAB, Badge, Card and Divider.
- **Date-Time Picker and Calendar** are alpha. Francis accepts that and will look at other libraries if they prove unreliable. The design's month-only fields (bill month, Starts from, Month being fixed) are a Select-style month list.
- **Custom pieces to build:** segmented button groups (Add charge: Shared or Personal; Household: Directly or Via someone; Settings: theme and preview sample) and single-select chips (split method and Who in Add charge). The design has a bottom navigation bar (house, history, users, settings); it is a custom piece (gluestack v5 has no bottom navigation bar), built on a restyled Tabs, as the theme and screen mapping doc says. Build the segmented control by restyling gluestack's Radio into joined segments, falling back to a plain Pressable row if that is awkward. Both use the same value and onChange API, so screens don't change if it is swapped.
- **Floating labels are dropped.** Inputs are outlined FormControl fields with the label above, plus helper and error text.
- **Theme files:** `config.ts` and `global.css` (in the docs folder) carry the colour tokens, type and radii. They have not been run in a build yet, so Manrope (five weights) and Lucide with NativeWind need a first-run check.
- **Styling risks:** NativeWind 4.x is stable and v5 is in preview. Upgrades can break build tooling, and fully dynamic class strings don't compile.
- **First build step:** a short spike on Home and the Add charge sheet, checking how easily gluestack restyles to the design tokens and how the bottom sheet and inputs feel.

For handover, Claude Design gets a screen-to-component mapping and the theme as design tokens. See the [Claude Design Handover](https://claude.ai/code/artifact/2c315be6-8cd6-4109-9e13-84c1ddfe2977).

## Design follow-ups

Delivered in the gluestack v5 rewrite on Oct 14, 2026, and kept here as a record. The new copy on these screens still needs a read-through.

- **Sign-in screen:** one entry screen with the Sign in with Google button, following Google's button styling. States: signed out, signing in, sign-in failed, account not allowed. Also used when a session ends, with a line such as "Your session ended, sign in again."
- **Settings:** add a "Signed in as … / Sign out" row.
- **Can't reach the server:** a blocking prompt with Retry, replacing the brief's small offline indicator. It also covers a sleeping free-tier database.
- **Loading and saving states** for Home, History, View bill and Household, and for sheets that save.
- **Failed save:** sheets stay open with the input intact and offer Retry.
- **Notification permission:** a short explanation before the system prompt, probably as a step in first-run setup, and a "notifications are blocked" state in Settings that links to system settings.
- **Returning user:** signing in to an existing account skips first-run setup and shows a loading state while data is fetched and reminders are rebuilt.
- **Leftover draft:** with no expiry enforced, the month's screen offers to continue or discard a bill draft (see Bill upload).

## Still to confirm at build time

Backend framework, database provider and auth library were settled on Oct 15 (Next.js route handlers, Neon, Better Auth). Still open, and none blocks the start:

- **Backup destination:** where the scheduled `pg_dump` goes.
- **Better Auth in Expo:** verify Google sign-in, secure storage and the email restriction in a development build. Token lifetime is the 90-day rolling session above.
- **Expo setup:** managed or bare, and the development build for notification channels and actions.
- **Reminder delay:** test how the notification plugin schedules reminders, overnight on a real phone.
- **gluestack details:** run the theme files in a build; check Manrope and Lucide in the NativeWind setup.

## Next steps

Done: the design handover, the gluestack v5 rewrite and the data model. The solution architect review was skipped.

1. Set up accounts and the project: a personal GitHub account for the backend repo, Vercel, Neon, Expo/EAS, a Google OAuth client for Android, a stable Android signing keystore, and the repo layout.
2. Run the gluestack spike on Home and the Add charge sheet.
3. Hand the stack, data model, Design Brief and theme and screen mapping doc to Claude Code, with a `CLAUDE.md`, to build.

Suggested build order, for Claude Code to confirm: the data model and split engine tested against the sample data; Home and bill upload; Recipient and messages; collecting payments and corrections; Household and Settings; notifications; History and first-run setup.
