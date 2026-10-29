import {
  addMonths,
  dateKeyOf,
  daysUntil,
  dueDateKey,
  formatCents,
  formatDateShort,
  formatMonthLabel,
  formatMonthName,
  type BadgeContent,
  type HomeAction,
  type HomeHero,
  type HomeNextMonthAction,
  type HomeNotice,
  type HomePrimaryAction,
  type HomeResponse,
  type HomeRow,
  type HomeStatus,
  type HouseholdConfig,
} from "@splithouse/shared";
import type { ChargeCategory, MessageKind } from "@/generated/prisma/enums";
import { billCoverage, coveragePercent } from "@/lib/bill/bill-coverage";
import { billDueBadge, chargeDueBadge, HOME_BADGES } from "./badges";
import { billDueDateKey, chargeDueDate } from "./due-dates";
import { messageRecipientIds, monthlyMessagedIds, unsentRecipientIds } from "./message-recipients";

/** A person, as much of them as Home needs. */
export interface HomePerson {
  id: string;
  name: string;
  isOwner: boolean;
}

/** A charge, as much of it as Home needs. */
export interface HomeChargeRow {
  id: string;
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  paidCents: number | null;
  paidOn: Date | null;
}

/** A WhatsApp chat opened for a person, as much of it as Home needs. */
export interface HomeMessage {
  personId: string;
  kind: MessageKind;
  /** The charge a nudge is about. Null for a monthly message. */
  chargeId: string | null;
  openedAt: Date;
}

/** The saved bill, as much of it as Home needs. */
export interface HomeBill {
  currentChargesCents: number;
  dueDate: Date | null;
  /** What Francis paid the provider. Null until he marks the bill paid. */
  paidCents: number | null;
  paidOn: Date | null;
}

/** Everything `buildHome` works from. */
export interface HomeInput {
  month: string;
  /** Date key of today in Singapore. */
  today: string;
  status: HomeStatus;
  /** The config pinned to the month. */
  config: HouseholdConfig;
  people: HomePerson[];
  charges: HomeChargeRow[];
  /** The saved bill. Null until one is saved. */
  bill: HomeBill | null;
  /** The month's message events, monthly messages and nudges. */
  messages: HomeMessage[];
}

/** When each chat was opened, as date keys: a payer's monthly message, and the latest nudge per charge. */
interface MessageDates {
  sentOn: Map<string, string>;
  nudgedOn: Map<string, string>;
}

// Rows due on the same day go: rent, recurring, utilities, then the bill.
const CATEGORY_RANK: Partial<Record<ChargeCategory, number>> = { RENT: 0, RECURRING: 1, UTILITIES: 2 };
const BILL_RANK = 3;

interface RankedRow {
  row: HomeRow;
  rank: number;
}

/** The date keys of when each chat was opened: the earliest monthly message per person, the latest nudge per charge. */
function messageDates(messages: HomeMessage[]): MessageDates {
  const sentOn = new Map<string, string>();
  const nudgedOn = new Map<string, string>();
  const byTime = [...messages].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  for (const m of byTime) {
    const day = dateKeyOf(m.openedAt);
    if (m.kind === "MONTHLY" && !sentOn.has(m.personId)) sentOn.set(m.personId, day);
    if (m.kind === "NUDGE" && m.chargeId) nudgedOn.set(m.chargeId, day);
  }
  return { sentOn, nudgedOn };
}

/**
 * The chip for a charge, first match wins: Paid, Not sent, Overdue N days, Due today, Due tomorrow,
 * Due in N days (up to three), Sent unpaid, Upcoming.
 */
function chargeBadge(flags: {
  paid: boolean;
  messageUnsent: boolean;
  /** Whole days to the due date, negative once past. Null when no due day is known. */
  days: number | null;
  /** The payer's monthly message has been opened. */
  sent: boolean;
}): BadgeContent {
  if (flags.paid) return HOME_BADGES.paid;
  if (flags.messageUnsent) return HOME_BADGES.notSent;
  const due = flags.days === null ? null : chargeDueBadge(flags.days);
  if (due) return due;
  return flags.sent ? HOME_BADGES.sentUnpaid : HOME_BADGES.upcoming;
}

/**
 * The detail line: a route via someone else, then where the charge stands (`Paid 3 Nov`,
 * `Nudged 2 Nov` or `Sent 2 Nov`). Paying direct is the default, so it is not said.
 */
function chargeDetail(
  charge: HomeChargeRow,
  names: Map<string, string>,
  dates: MessageDates,
  payerId: string,
): string | null {
  const parts = [routeDetail(charge.payViaPersonId, names), chargeState(charge, dates, payerId)].filter(
    (p) => p !== null,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Where the charge stands: paid, else nudged, else sent. Null before the monthly message. */
function chargeState(charge: HomeChargeRow, dates: MessageDates, payerId: string): string | null {
  if (charge.paidCents !== null) return charge.paidOn ? `Paid ${formatDateShort(dateKeyOf(charge.paidOn))}` : null;
  const nudged = dates.nudgedOn.get(charge.id);
  if (nudged) return `Nudged ${formatDateShort(nudged)}`;
  const sent = dates.sentOn.get(payerId);
  return sent ? `Sent ${formatDateShort(sent)}` : null;
}

/** The route part of the detail line: only a route via someone else is worth saying. */
function routeDetail(viaPersonId: string | null | undefined, names: Map<string, string>): string | null {
  return viaPersonId ? `Pays via ${names.get(viaPersonId)}` : null;
}

/**
 * One row per real charge. A utilities charge whose payer has no monthly message yet is `Not sent`
 * and has no Mark paid, since the message comes before any payment. When the person pays for
 * themselves the row starts open with a Review message link; a charge paid via someone else has
 * no message of its own, so it stays closed with the usual View details link. An unpaid charge
 * past its due date is shaded, starts open and offers Nudge (or Nudge again) beside Mark paid.
 */
function chargeRow(
  input: HomeInput,
  charge: HomeChargeRow,
  names: Map<string, string>,
  unsentIds: Set<string>,
  dates: MessageDates,
): RankedRow {
  const dueDate = chargeDueDate(input.month, input.config, charge);
  const payerId = charge.payViaPersonId ?? charge.personId;
  const unpaid = charge.paidCents === null;
  const messageUnsent = unpaid && charge.category === "UTILITIES" && unsentIds.has(payerId);
  // Someone paid via another person rides in that person's message, so only the payer's own rows
  // are reviewed. A via row stays Not sent until the payer's message goes out, but has no message.
  const ownMessage = messageUnsent && charge.payViaPersonId === null;
  const badge = chargeBadge({
    paid: !unpaid,
    messageUnsent,
    days: dueDate === null ? null : daysUntil(dueDate, input.today),
    sent: dates.sentOn.has(payerId),
  });
  const dueToday = unpaid && badge === HOME_BADGES.dueToday;
  const overdue = unpaid && badge.tone === "danger";
  const markPaid: HomeAction = {
    label: "Mark paid",
    tone: "outline",
    icon: "check",
    target: { kind: "mark-paid", chargeId: charge.id },
  };
  const nudge: HomeAction = {
    label: dates.nudgedOn.has(charge.id) ? "Nudge again" : "Nudge",
    tone: "warning",
    icon: "bell",
    target: { kind: "recipient", month: input.month, personId: payerId },
  };
  return {
    rank: CATEGORY_RANK[charge.category] ?? 0,
    row: {
      id: charge.id,
      dueDate,
      title: `${charge.label} · ${names.get(charge.personId)}`,
      amount: formatCents(charge.amountCents),
      detail: chargeDetail(charge, names, dates, payerId),
      badge,
      tint: dueToday ? "info" : overdue ? "warning" : "none",
      expanded: dueToday || overdue || ownMessage,
      note: dueToday && input.status === "collecting" ? "You’ll get a payment check tonight if it’s still unpaid." : null,
      actions: unpaid && !messageUnsent ? (overdue ? [nudge, markPaid] : [markPaid]) : [],
      link: {
        label: ownMessage ? "Review message" : "View details",
        target: { kind: "recipient", month: input.month, personId: payerId },
      },
    },
  };
}

/**
 * Utilities rows for charges that do not exist until a bill is saved, taken from the pinned
 * config. A person paid via someone with no due day of their own uses that person's due day.
 */
function projectedUtilitiesRows(input: HomeInput, names: Map<string, string>): RankedRow[] {
  const { config, month } = input;
  return config.people
    .filter((p) =>
      p.role === "TENANT"
        ? p.utilityShares > 0
        : p.role === "PRIMARY" && config.categories.utilities.primaryBps > 0,
    )
    .map((p) => {
      const route = p.routes.UTILITIES;
      const via =
        route?.kind === "VIA" ? config.people.find((q) => q.personId === route.viaPersonId) : undefined;
      return {
        rank: CATEGORY_RANK.UTILITIES!,
        row: {
          id: `utilities-${p.personId}`,
          dueDate: dueDateKey(month, p.dueDays.UTILITIES ?? via?.dueDays.UTILITIES),
          title: `Utilities · ${names.get(p.personId)}`,
          amount: "—",
          detail: routeDetail(via?.personId, names),
          badge: HOME_BADGES.needsBill,
          tint: "none",
          expanded: false,
          note: "Worked out once the utilities bill is uploaded.",
          actions: [],
          link: {
            label: "View details",
            target: { kind: "recipient", month, personId: via?.personId ?? p.personId },
          },
        },
      } satisfies RankedRow;
    });
}

/** The info Alert at the bottom of the hero while an unsaved draft is waiting. Both buttons open the draft. */
function draftNotice(month: string): HomeNotice {
  return {
    title: "Unfinished bill draft",
    text: `You started uploading a bill for ${formatMonthName(month)} and didn’t save it.`,
    actions: [
      { label: "Continue", tone: "primary", icon: null, target: { kind: "bill-draft-continue", month } },
      { label: "Discard", tone: "outline", icon: null, target: { kind: "bill-draft-discard", month } },
    ],
  };
}

/** The bill's due date: the saved bill's own date supersedes the day in the config. */
function billDueDate(input: HomeInput): string | null {
  return billDueDateKey(input.month, input.config, input.bill?.dueDate ?? null);
}

function billRow(input: HomeInput, ownerIds: Set<string>): RankedRow {
  const dueDate = billDueDate(input);
  if (!input.bill) {
    return {
      rank: BILL_RANK,
      row: {
        id: "bill",
        dueDate,
        title: "Utilities bill",
        amount: "—",
        detail: "You pay utilities",
        badge: HOME_BADGES.billNotUploaded,
        tint: "none",
        expanded: false,
        note: null,
        actions: [],
        link: { label: "Upload bill", target: { kind: "bill-upload", month: input.month } },
      },
    };
  }
  const billPaid = input.bill.paidCents !== null;
  // Mark bill paid is only offered while collecting, and goes once the bill is paid.
  const collecting = input.status === "collecting" && !billPaid;
  const coverage = billCoverage(input.charges, ownerIds, input.bill.currentChargesCents);
  return {
    rank: BILL_RANK,
    row: {
      id: "bill",
      dueDate,
      title: "Utilities bill",
      amount: formatCents(input.bill.currentChargesCents),
      detail: billPaid && input.bill.paidOn ? `You paid ${formatDateShort(dateKeyOf(input.bill.paidOn))}` : "You pay utilities",
      badge: billPaid
        ? HOME_BADGES.paid
        : dueDate === null
          ? HOME_BADGES.upcoming
          : billDueBadge(daysUntil(dueDate, input.today)),
      tint: "none",
      // While collecting, the bill starts open so Mark bill paid is one tap away.
      expanded: collecting,
      note:
        input.status === "unsent"
          ? "Nothing collected yet. Shares go out with the messages."
          : collecting
            ? `${formatCents(coverage.coveredCents)} of ${formatCents(coverage.totalCents)} covered so far.`
            : null,
      actions: collecting
        ? [
            {
              label: "Mark bill paid",
              tone: "outline",
              icon: "check",
              target: { kind: "mark-bill-paid", month: input.month },
            },
          ]
        : [],
      link: { label: "View bill", target: { kind: "bill-view", month: input.month } },
    },
  };
}

/**
 * Non-owner charges other than utilities: what is still fronted (owed minus paid, never below
 * zero) and what has come back so far.
 */
function frontingTotals(charges: HomeChargeRow[], ownerIds: Set<string>): { frontingCents: number; backCents: number } {
  const others = charges.filter((c) => !ownerIds.has(c.personId) && c.category !== "UTILITIES");
  const owed = others.reduce((sum, c) => sum + c.amountCents, 0);
  const paid = others.reduce((sum, c) => sum + (c.paidCents ?? 0), 0);
  const frontingCents = Math.max(0, owed - paid);
  return { frontingCents, backCents: owed - frontingCents };
}

/** The `unsent` hero text, counting chats rather than rows: Sam's utilities ride in Priya's message. */
function unsentText(unsentCount: number): string {
  return unsentCount === 1
    ? "1 message is ready. Open it to review it, then send it on WhatsApp yourself."
    : `${unsentCount} messages are ready. Open each one to review it, then send it on WhatsApp yourself.`;
}

/** What the hero says about payments due today: the Alert's line and amount, and the compact status. */
interface DueTodayCopy {
  text: string;
  amount: string;
  compactStatus: string;
}

/**
 * The hero's due-today copy while collecting: one line naming the charge when one payment is due
 * a count when several are. Only unpaid charges of people
 * other than the owner count.
 *
 * @returns The copy, or null when nothing is due today.
 */
function dueTodayCopy(input: HomeInput, names: Map<string, string>, ownerIds: Set<string>): DueTodayCopy | null {
  if (input.status !== "collecting") return null;
  const due = input.charges.filter(
    (c) => c.paidCents === null && !ownerIds.has(c.personId) && chargeDueDate(input.month, input.config, c) === input.today,
  );
  if (due.length === 0) return null;

  const amount = formatCents(due.reduce((sum, c) => sum + c.amountCents, 0));
  if (due.length > 1) {
    return { text: `${due.length} payments are due today`, amount, compactStatus: `${due.length} payments due today` };
  }
  const [charge] = due;
  const what = `${names.get(charge.personId)}’s ${charge.label.toLowerCase()}`;
  // "Utilities" is plural, "Rent" and "Starhub" are not.
  return {
    text: `${what} ${charge.category === "UTILITIES" ? "are" : "is"} due today`,
    amount,
    compactStatus: `${what} due today`,
  };
}

function buildHero(
  input: HomeInput,
  ownerIds: Set<string>,
  { frontingCents: fronting, backCents }: ReturnType<typeof frontingTotals>,
  unsentCount: number,
  dueToday: DueTodayCopy | null,
): HomeHero {
  switch (input.status) {
    case "settled": {
      if (!input.bill) throw new Error("The settled status needs a saved bill");
      const billPaidOn = input.bill.paidOn ? ` Utilities bill paid ${formatDateShort(dateKeyOf(input.bill.paidOn))}.` : "";
      return {
        dateLine: `${formatDateShort(input.today)} · Done`,
        steps: [
          { label: "Upload bill", state: "done" },
          { label: "Send messages", state: "done" },
          { label: "Settle up", state: "done" },
        ],
        compactStatus: `${formatMonthName(input.month)} is settled`,
        body: {
          kind: "settled",
          title: `${formatMonthName(input.month)} is settled`,
          text: `Everyone’s paid.${billPaidOn}`,
          tiles: [
            { label: "You’re fronting", value: formatCents(fronting) },
            { label: "Utilities bill covered", value: formatCents(input.bill.currentChargesCents) },
          ],
        },
        notice: null,
        dueToday: null,
      };
    }
    case "collecting": {
      if (!input.bill) throw new Error("The collecting status needs a saved bill");
      const coverage = billCoverage(input.charges, ownerIds, input.bill.currentChargesCents);
      const dueDate = billDueDate(input);
      const share =
        coverage.othersPaid === 0
          ? "Your share only so far"
          : `Your share and ${coverage.othersPaid} of ${coverage.othersTotal} others paid`;
      return {
        dateLine: `${formatDateShort(input.today)} · Collecting`,
        steps: [
          { label: "Upload bill", state: "done" },
          { label: "Send messages", state: "done" },
          { label: "Settle up", state: "current" },
        ],
        compactStatus: dueToday?.compactStatus ?? `Collecting · ${formatCents(fronting)} fronted`,
        body: {
          kind: "collecting",
          fronting: {
            label: "You’re fronting",
            value: formatCents(fronting),
            note: `Rent, aircon and other charges paid for others · ${formatCents(backCents)} back so far`,
          },
          coverage: {
            label: "Utilities bill covered",
            text: `${formatCents(coverage.coveredCents)} of ${formatCents(coverage.totalCents)}`,
            percent: coveragePercent(coverage),
            note: dueDate === null ? share : `${share} · due ${formatDateShort(dueDate)}`,
          },
        },
        notice: null,
        dueToday: dueToday && { text: dueToday.text, amount: dueToday.amount },
      };
    }
    case "unsent": {
      if (!input.bill) throw new Error("The unsent status needs a saved bill");
      const dueDate = billDueDate(input);
      return {
        dateLine: `${formatDateShort(input.today)} · Step 2 of 3`,
        steps: [
          { label: "Upload bill", state: "done" },
          { label: "Send messages", state: "current" },
          { label: "Settle up", state: "todo" },
        ],
        compactStatus: unsentCount === 1 ? "1 message to send" : `${unsentCount} messages to send`,
        body: {
          kind: "unsent",
          title: "Bill’s in. Send the breakdowns",
          text: unsentText(unsentCount),
          tiles: [
            { label: "You’re fronting", value: formatCents(fronting) },
            {
              label: dueDate === null ? "Utilities bill" : `Utilities bill · due ${formatDateShort(dueDate)}`,
              value: formatCents(input.bill.currentChargesCents),
            },
          ],
        },
        notice: null,
        dueToday: null,
      };
    }
    case "bill_missing":
    case "draft":
      return {
        dateLine: `${formatDateShort(input.today)} · Step 1 of 3`,
        steps: [
          { label: "Upload bill", state: "current" },
          { label: "Send messages", state: "todo" },
          { label: "Settle up", state: "todo" },
        ],
        compactStatus: "Waiting on the utilities bill",
        body: {
          kind: "waiting",
          title: "Waiting on the utilities bill",
          text: "It usually lands around the 2nd. Upload it and everyone’s utilities share is worked out.",
          tiles: [
            { label: "You’re fronting", value: formatCents(fronting) },
            { label: "Utilities bill coverage", value: "No bill yet" },
          ],
        },
        notice: input.status === "draft" ? draftNotice(input.month) : null,
        dueToday: null,
      };
  }
}

function buildPrimaryAction(input: HomeInput): HomePrimaryAction {
  switch (input.status) {
    case "bill_missing":
      return {
        label: "Upload utilities bill",
        icon: "upload",
        target: { kind: "bill-upload", month: input.month },
      };
    case "draft":
      return {
        label: "Continue bill upload",
        icon: "file-pen",
        target: { kind: "bill-draft-continue", month: input.month },
      };
    case "unsent":
      // Each message is reviewed from its row, so there is no footer button.
      return null;
    case "settled":
      // Nothing is left to do this month.
      return null;
    case "collecting":
      return { label: "Record payment", icon: "banknote", target: { kind: "record-payment", month: input.month } };
  }
}

/**
 * The settled month's bottom button and the Close dialog it opens. The label is fixed; the dialog
 * names the month being closed and the next one.
 *
 * @returns The action, or null in every status but `settled`.
 */
function buildNextMonthAction(input: HomeInput): HomeNextMonthAction {
  if (input.status !== "settled") return null;
  const closing = formatMonthName(input.month);
  const next = formatMonthName(addMonths(input.month, 1));
  return {
    label: "Start next month",
    dialog: {
      title: `Close ${closing}?`,
      body: `This closes ${formatMonthLabel(input.month)} and starts ${next}. You can’t undo this.`,
      items: [
        `${closing} moves to History and becomes read-only`,
        `Changes to any household configuration will take effect after ${next}`,
      ],
    },
  };
}

/**
 * Builds the Home response: the hero, one row per charge ordered by due date, and the footer.
 * Rows for utilities charges that do not exist yet are projected from the pinned config.
 *
 * @param input - The month, today's date key, its status, the pinned config and what was read.
 * @returns The response, ready to render.
 */
export function buildHome(input: HomeInput): HomeResponse {
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const ownerIds = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));
  const unsentIds = unsentRecipientIds(messageRecipientIds(input.charges, ownerIds), monthlyMessagedIds(input.messages));
  const unsentSet = new Set(unsentIds);
  const dates = messageDates(input.messages);

  // The owner's own charges are not payments to anyone, so they get no row.
  const ranked: RankedRow[] = [
    ...input.charges
      .filter((c) => !ownerIds.has(c.personId))
      .map((c) => chargeRow(input, c, names, unsentSet, dates)),
    ...(input.status === "bill_missing" || input.status === "draft" ? projectedUtilitiesRows(input, names) : []),
    billRow(input, ownerIds),
  ];
  ranked.sort(
    (a, b) =>
      (a.row.dueDate ?? "9999-12-31").localeCompare(b.row.dueDate ?? "9999-12-31") ||
      a.rank - b.rank ||
      a.row.title.localeCompare(b.row.title),
  );

  return {
    month: input.month,
    monthName: formatMonthLabel(input.month),
    status: input.status,
    hero: buildHero(
      input,
      ownerIds,
      frontingTotals(input.charges, ownerIds),
      unsentIds.length,
      dueTodayCopy(input, names, ownerIds),
    ),
    rows: ranked.map((r) => r.row),
    primaryAction: buildPrimaryAction(input),
    nextMonthAction: buildNextMonthAction(input),
  };
}
