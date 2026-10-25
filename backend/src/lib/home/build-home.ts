import {
  dateKeyOf,
  daysUntil,
  dueDateKey,
  formatCents,
  formatDateShort,
  formatMonthLabel,
  formatMonthName,
  type BadgeContent,
  type ChargeType,
  type HomeAction,
  type HomeHero,
  type HomeNotice,
  type HomePrimaryAction,
  type HomeResponse,
  type HomeRow,
  type HomeStatus,
  type HouseholdConfig,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { billDueBadge, HOME_BADGES } from "./badges";
import { messageRecipientIds, unsentRecipientIds } from "./message-recipients";

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
}

/** The saved bill, as much of it as Home needs. */
export interface HomeBill {
  currentChargesCents: number;
  dueDate: Date | null;
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
  /** The people who have a MONTHLY message event for the month. */
  messagedPersonIds: string[];
}

// Rows due on the same day go: rent, recurring, utilities, then the bill.
const CATEGORY_RANK: Partial<Record<ChargeCategory, number>> = { RENT: 0, RECURRING: 1, UTILITIES: 2 };
const BILL_RANK = 3;

interface RankedRow {
  row: HomeRow;
  rank: number;
}

function chargeBadge(
  charge: HomeChargeRow,
  dueDate: string | null,
  today: string,
  messageUnsent: boolean,
): BadgeContent {
  if (charge.paidCents !== null)
    return HOME_BADGES.paid;
  if (messageUnsent)
    return HOME_BADGES.notSent;
  if (dueDate !== null && daysUntil(dueDate, today) === 0)
    return HOME_BADGES.dueToday;

  return HOME_BADGES.upcoming;
}

/** The detail line: only a route via someone else is worth saying, paying direct is the default. */
function routeDetail(viaPersonId: string | null | undefined, names: Map<string, string>): string | null {
  return viaPersonId ? `Pays via ${names.get(viaPersonId)}` : null;
}

/**
 * The date a charge's row shows. A charge stored with no due date that is paid via someone
 * (Sam's utilities) uses that person's due day for the same charge type, as the projected
 * row did before the bill was saved. The stored charge is not changed.
 */
function chargeDueDate(input: HomeInput, charge: HomeChargeRow): string | null {
  if (charge.dueDate) return dateKeyOf(charge.dueDate);
  if (!charge.payViaPersonId) return null;
  const via = input.config.people.find((p) => p.personId === charge.payViaPersonId);
  return dueDateKey(input.month, via?.dueDays[charge.category as ChargeType]);
}

/**
 * One row per real charge. A utilities charge whose payer has no monthly message yet is `Not sent`
 * and has no Mark paid, since the message comes before any payment. When the person pays for
 * themselves the row starts open with a Review message link; a charge paid via someone else has
 * no message of its own, so it stays closed with the usual View details link.
 */
function chargeRow(
  input: HomeInput,
  charge: HomeChargeRow,
  names: Map<string, string>,
  unsentIds: Set<string>,
): RankedRow {
  const dueDate = chargeDueDate(input, charge);
  const payerId = charge.payViaPersonId ?? charge.personId;
  const unpaid = charge.paidCents === null;
  const messageUnsent = unpaid && charge.category === "UTILITIES" && unsentIds.has(payerId);
  // Someone paid via another person rides in that person's message, so only the payer's own rows
  // are reviewed. A via row stays Not sent until the payer's message goes out, but has no message.
  const ownMessage = messageUnsent && charge.payViaPersonId === null;
  const badge = chargeBadge(charge, dueDate, input.today, messageUnsent);
  const dueToday = unpaid && badge === HOME_BADGES.dueToday;
  const markPaid: HomeAction = {
    label: "Mark paid",
    tone: "outline",
    icon: "check",
    target: { kind: "mark-paid", chargeId: charge.id },
  };
  return {
    rank: CATEGORY_RANK[charge.category] ?? 0,
    row: {
      id: charge.id,
      dueDate,
      title: `${charge.label} · ${names.get(charge.personId)}`,
      amount: formatCents(charge.amountCents),
      detail: routeDetail(charge.payViaPersonId, names),
      badge,
      tint: dueToday ? "info" : "none",
      expanded: dueToday || ownMessage,
      note: null,
      actions: unpaid && !messageUnsent ? [markPaid] : [],
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
      { label: "Discard draft", tone: "outline", icon: null, target: { kind: "bill-draft-discard", month } },
    ],
  };
}

/** The bill's due date: the saved bill's own date supersedes the day in the config. */
function billDueDate(input: HomeInput): string | null {
  return input.bill?.dueDate
    ? dateKeyOf(input.bill.dueDate)
    : dueDateKey(input.month, input.config.categories.utilities.billDueDay);
}

function billRow(input: HomeInput): RankedRow {
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
  return {
    rank: BILL_RANK,
    row: {
      id: "bill",
      dueDate,
      title: "Utilities bill",
      amount: formatCents(input.bill.currentChargesCents),
      detail: "You pay utilities",
      badge: dueDate === null ? HOME_BADGES.upcoming : billDueBadge(daysUntil(dueDate, input.today)),
      tint: "none",
      expanded: false,
      note: input.status === "unsent" ? "Nothing collected yet. Shares go out with the messages." : null,
      actions: [],
      link: { label: "View bill", target: { kind: "bill-view", month: input.month } },
    },
  };
}

/** Non-owner charges other than utilities, minus what has been paid. Never below zero. */
function frontingCents(charges: HomeChargeRow[], ownerIds: Set<string>): number {
  const others = charges.filter((c) => !ownerIds.has(c.personId) && c.category !== "UTILITIES");
  const owed = others.reduce((sum, c) => sum + c.amountCents, 0);
  const paid = others.reduce((sum, c) => sum + (c.paidCents ?? 0), 0);
  return Math.max(0, owed - paid);
}

/** The `unsent` hero text, counting chats rather than rows: Sam's utilities ride in Priya's message. */
function unsentText(unsentCount: number): string {
  return unsentCount === 1
    ? "1 message is ready. Open it to review it, then send it on WhatsApp yourself."
    : `${unsentCount} messages are ready. Open each one to review it, then send it on WhatsApp yourself.`;
}

function buildHero(input: HomeInput, fronting: number, unsentCount: number): HomeHero {
  switch (input.status) {
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
  }
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
  const unsentIds = unsentRecipientIds(messageRecipientIds(input.charges, ownerIds), input.messagedPersonIds);
  const unsentSet = new Set(unsentIds);

  // The owner's own charges are not payments to anyone, so they get no row.
  const ranked: RankedRow[] = [
    ...input.charges
      .filter((c) => !ownerIds.has(c.personId))
      .map((c) => chargeRow(input, c, names, unsentSet)),
    ...(input.status === "bill_missing" || input.status === "draft" ? projectedUtilitiesRows(input, names) : []),
    billRow(input),
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
    hero: buildHero(input, frontingCents(input.charges, ownerIds), unsentIds.length),
    rows: ranked.map((r) => r.row),
    primaryAction: buildPrimaryAction(input),
  };
}
