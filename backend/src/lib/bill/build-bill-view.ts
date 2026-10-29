import {
  billLineSchema,
  dateKeyOf,
  daysUntil,
  formatCents,
  formatDateMedium,
  formatDateRange,
  formatDateShort,
  formatMonthLabel,
  type BadgeContent,
  type BillViewFact,
  type BillViewLine,
  type BillViewPerson,
  type BillViewResponse,
  type HouseholdConfig,
} from "@splithouse/shared";
import { z } from "zod";
import type { ChargeCategory, MessageKind } from "@/generated/prisma/enums";
import { billDueInBadge, HOME_BADGES, overdueBadge, paidOnBadge } from "@/lib/home/badges";
import { billDueDateKey, chargeDueDate } from "@/lib/home/due-dates";
import { messageRecipientIds, monthlyMessagedIds, unsentRecipientIds } from "@/lib/home/message-recipients";
import { billCoverage, coveragePercent } from "./bill-coverage";

/** A person, as much of them as View bill needs. */
export interface BillViewPersonRow {
  id: string;
  name: string;
  isOwner: boolean;
}

/** A charge of the month, as much of it as View bill needs. Only utilities charges get a row. */
export interface BillViewChargeRow {
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  amountCents: number;
  dueDate: Date | null;
  paidCents: number | null;
  paidOn: Date | null;
}

/** The saved bill, as much of it as View bill needs. Its file is read without the bytes. */
export interface BillViewBillRow {
  currentChargesCents: number;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  dueDate: Date | null;
  /** The saved lines, `{ label, cents }[]`, as stored in the `lines` JSON column. */
  lines: unknown;
  paidCents: number | null;
  paidOn: Date | null;
  createdAt: Date;
  file: { filename: string; pageCount: number | null } | null;
}

/** Everything `buildBillView` works from. */
export interface BillViewInput {
  month: string;
  /** Date key of today in Singapore. */
  today: string;
  /** True when the month is the one Home shows, so Mark bill paid can be offered. */
  isActiveMonth: boolean;
  /** The config pinned to the month. */
  config: HouseholdConfig;
  people: BillViewPersonRow[];
  /** The month's charges, every category: who still has no message is worked out from all of them. */
  charges: BillViewChargeRow[];
  bill: BillViewBillRow;
  /** The month's message events. */
  messages: { personId: string; kind: MessageKind }[];
}

const savedLinesSchema = z.array(billLineSchema);

/** The bill's lines as display text. A line saved with no amount shows a dash. */
function billLines(lines: unknown): BillViewLine[] {
  // Written only by the save service and the seed, in the shared line shape.
  const parsed = savedLinesSchema.safeParse(lines);
  if (!parsed.success) return [];
  return parsed.data.map((l) => ({ label: l.label, amount: l.cents === null ? "—" : formatCents(l.cents) }));
}

/**
 * A share in thousandths as words.
 *
 * @returns e.g. `1.5 shares`, `1 share`, `0.25 shares`.
 */
function sharesText(thousandths: number): string {
  if (thousandths === 1000) return "1 share";
  return `${Number((thousandths / 1000).toFixed(3))} shares`;
}

/**
 * Each person's utilities share in thousandths: tenants have their own, and the owner and the
 * primary tenant split what is left by basis points, as the split engine does.
 */
function utilityShares(config: HouseholdConfig): Map<string, number> {
  const { totalShares, ownerBps, primaryBps } = config.categories.utilities;
  const tenantShares = config.people.reduce((sum, p) => sum + (p.role === "TENANT" ? p.utilityShares : 0), 0);
  const remainder = totalShares - tenantShares;
  return new Map(
    config.people.map((p) => {
      if (p.role === "TENANT") return [p.personId, p.utilityShares];
      return [p.personId, Math.round((remainder * (p.role === "OWNER" ? ownerBps : primaryBps)) / 10000)];
    }),
  );
}

/**
 * The chip for one person's share, first match wins: Covered (the user), Paid with its day, Not
 * sent (their payer's monthly message is not opened yet), Overdue N days, Waiting.
 */
function personBadge(
  input: BillViewInput,
  charge: BillViewChargeRow,
  isOwner: boolean,
  unsentIds: Set<string>,
): BadgeContent {
  if (isOwner) return HOME_BADGES.covered;
  if (charge.paidCents !== null) return paidOnBadge(charge.paidOn ? dateKeyOf(charge.paidOn) : null);
  if (unsentIds.has(charge.payViaPersonId ?? charge.personId)) return HOME_BADGES.notSent;
  const dueDate = chargeDueDate(input.month, input.config, charge);
  const days = dueDate === null ? null : daysUntil(dueDate, input.today);
  return days !== null && days < 0 ? overdueBadge(-days) : HOME_BADGES.waiting;
}

/** One row per utilities charge: the user first, then everyone else in household order. */
function people(input: BillViewInput, ownerIds: Set<string>, unsentIds: Set<string>): BillViewPerson[] {
  const shares = utilityShares(input.config);
  const order = new Map(input.config.people.map((p, i) => [p.personId, i]));
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const rank = (personId: string) => (ownerIds.has(personId) ? -1 : (order.get(personId) ?? input.people.length));
  return input.charges
    .filter((c) => c.category === "UTILITIES")
    .sort((a, b) => rank(a.personId) - rank(b.personId))
    .map((c) => {
      const isOwner = ownerIds.has(c.personId);
      return {
        id: c.personId,
        name: isOwner ? "You" : (names.get(c.personId) ?? ""),
        shares: sharesText(shares.get(c.personId) ?? 0),
        amount: formatCents(c.amountCents),
        badge: personBadge(input, c, isOwner, unsentIds),
      };
    });
}

/** Bill month, Billing period and Due date when known, then the day the user paid it. */
function facts(input: BillViewInput, dueDate: string | null): BillViewFact[] {
  const { bill } = input;
  const rows: BillViewFact[] = [{ label: "Bill month", value: formatMonthLabel(input.month) }];
  if (bill.billingPeriodStart && bill.billingPeriodEnd) {
    rows.push({
      label: "Billing period",
      value: formatDateRange(dateKeyOf(bill.billingPeriodStart), dateKeyOf(bill.billingPeriodEnd)),
    });
  }
  if (dueDate) rows.push({ label: "Due date", value: formatDateMedium(dueDate) });
  if (bill.paidCents !== null && bill.paidOn) {
    rows.push({ label: "You paid", value: formatDateMedium(dateKeyOf(bill.paidOn)) });
  }
  return rows;
}

/** The line under the file name: the page count when known, and the day the bill was saved. */
function fileMeta(pageCount: number | null, createdAt: Date): string {
  const added = `added ${formatDateShort(dateKeyOf(createdAt))}`;
  if (pageCount === null) return added;
  return `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${added}`;
}

/**
 * Builds View bill: the bill card with its due or paid chip and lines, how much is collected with a
 * row per person, the facts, the stored file and the footer. Mark bill paid is offered only on the
 * month Home shows, while every message is out and the bill is unpaid (Home's `collecting`).
 *
 * @param input - The month, today's date key, the pinned config and what was read.
 * @returns The response, ready to render.
 */
export function buildBillView(input: BillViewInput): BillViewResponse {
  const { bill } = input;
  const ownerIds = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));
  const unsentIds = new Set(
    unsentRecipientIds(messageRecipientIds(input.charges, ownerIds), monthlyMessagedIds(input.messages)),
  );
  const billPaid = bill.paidCents !== null;
  const dueDate = billDueDateKey(input.month, input.config, bill.dueDate);
  const coverage = billCoverage(input.charges, ownerIds, bill.currentChargesCents);

  const badge = billPaid
    ? paidOnBadge(bill.paidOn ? dateKeyOf(bill.paidOn) : null)
    : dueDate === null
      ? HOME_BADGES.upcoming
      : billDueInBadge(daysUntil(dueDate, input.today));

  return {
    month: input.month,
    monthName: formatMonthLabel(input.month),
    hero: { amount: formatCents(bill.currentChargesCents), badge, lines: billLines(bill.lines) },
    collection: {
      title: coverage.coveredCents >= coverage.totalCents ? "Fully collected" : "Collected so far",
      note: `${formatCents(coverage.coveredCents)} of ${formatCents(coverage.totalCents)}`,
      percent: coveragePercent(coverage),
      people: people(input, ownerIds, unsentIds),
    },
    facts: facts(input, dueDate),
    file: bill.file && { filename: bill.file.filename, meta: fileMeta(bill.file.pageCount, bill.createdAt) },
    action:
      input.isActiveMonth && !billPaid && unsentIds.size === 0
        ? { label: "Mark bill paid", target: { kind: "mark-bill-paid", month: input.month } }
        : null,
  };
}
