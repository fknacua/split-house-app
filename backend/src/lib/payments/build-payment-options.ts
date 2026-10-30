import {
  daysUntil,
  formatCents,
  formatMonthShort,
  type HouseholdConfig,
  type PaymentOptionCharge,
  type PaymentOptionPerson,
  type PaymentOptionsResponse,
} from "@splithouse/shared";
import { chargeDueDate } from "@/lib/home/due-dates";
import { buildPaymentSheet, type PaymentSheetChargeRow } from "./build-payment-sheet";

/** A person who may appear in the From list. */
export interface PaymentOptionsPerson {
  id: string;
  name: string;
  isOwner: boolean;
}

/** An unpaid charge, with the person it belongs to and the config pinned to its month. */
export interface PaymentOptionsChargeRow extends PaymentSheetChargeRow {
  personId: string;
  config: HouseholdConfig;
}

/** What `buildPaymentOptions` reads. */
export interface PaymentOptionsInput {
  /** The newest opened month, `YYYY-MM`. */
  month: string;
  /** Today's date key in Asia/Singapore. */
  today: string;
  people: PaymentOptionsPerson[];
  /** Unpaid charges in `month` and earlier months. Paid ones and credits are left out here too. */
  charges: PaymentOptionsChargeRow[];
}

// A person reads "upcoming" when none of their charges is overdue or due within this many days.
const UPCOMING_AFTER_DAYS = 7;

/** A charge in the For list, with what it is sorted and summed by. */
interface Option {
  option: PaymentOptionCharge;
  month: string;
  dueDate: string | null;
  amountCents: number;
}

/**
 * Record payment's From and For lists. Each charge is listed under the person who pays it: the
 * person it is paid via, or the person themselves, so Priya's list carries Sam's utilities. The
 * owner's own charges, paid charges and credits are not payments to record, so they are left out.
 *
 * @param input - The month, today, the people and the unpaid charges up to that month.
 * @returns The lists, most urgent person first; empty when nothing is unpaid.
 */
export function buildPaymentOptions(input: PaymentOptionsInput): PaymentOptionsResponse {
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const ownerIds = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));

  const byPayer = new Map<string, Option[]>();
  for (const charge of input.charges) {
    if (charge.paidCents !== null || charge.amountCents <= 0 || charge.month > input.month) continue;
    const payerId = charge.payViaPersonId ?? charge.personId;
    if (ownerIds.has(charge.personId) || ownerIds.has(payerId)) continue;
    const routed = payerId !== charge.personId;
    const label = [charge.label, ...(routed ? [charge.person.name] : []), formatMonthShort(charge.month)].join(" · ");
    const options = byPayer.get(payerId) ?? [];
    options.push({
      option: {
        label,
        sheet: buildPaymentSheet({ today: input.today, config: charge.config, charge, mode: "record" }),
      },
      month: charge.month,
      dueDate: chargeDueDate(charge.month, charge.config, charge),
      amountCents: charge.amountCents,
    });
    byPayer.set(payerId, options);
  }

  const people = [...byPayer].map(([personId, options]) => {
    // The newest month first, then earlier months; by due date (none last) within a month.
    options.sort(
      (a, b) =>
        b.month.localeCompare(a.month) ||
        (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
        a.option.label.localeCompare(b.option.label),
    );
    const earliestDue = options.reduce<string | null>(
      (earliest, o) => (o.dueDate !== null && (earliest === null || o.dueDate < earliest) ? o.dueDate : earliest),
      null,
    );
    const person: PaymentOptionPerson = {
      personId,
      name: names.get(personId) ?? "",
      detail: detailLine(options, input.today),
      charges: options.map((o) => o.option),
    };
    return { person, earliestDue };
  });

  people.sort(
    (a, b) =>
      (a.earliestDue ?? "9999-12-31").localeCompare(b.earliestDue ?? "9999-12-31") ||
      a.person.name.localeCompare(b.person.name),
  );
  return { month: input.month, people: people.map((p) => p.person) };
}

/** `2 unpaid · $1,050.79`, or `1 upcoming · $950.00` while nothing is overdue or due within 7 days. */
function detailLine(options: Option[], today: string): string {
  const total = options.reduce((sum, o) => sum + o.amountCents, 0);
  const soon = options.some((o) => o.dueDate !== null && daysUntil(o.dueDate, today) <= UPCOMING_AFTER_DAYS);
  return `${options.length} ${soon ? "unpaid" : "upcoming"} · ${formatCents(total)}`;
}
