import {
  daysUntil,
  formatCents,
  formatDateShort,
  formatMonthShort,
  formatMonthShortLabel,
  type HouseholdConfig,
  type RecordPaymentChargeRow,
  type RecordPaymentConfirm,
  type RecordPaymentFromOption,
  type RecordPaymentSheet,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { dueInBadge, HOME_BADGES } from "@/lib/home/badges";
import { chargeDueDate } from "@/lib/home/due-dates";

/** A person who may appear in the From list. */
export interface RecordPaymentPerson {
  id: string;
  name: string;
  isOwner: boolean;
}

/** A charge in the active month or earlier, with the config pinned to its month. */
export interface RecordPaymentCharge {
  id: string;
  personId: string;
  month: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  payViaPersonId: string | null;
  paidCents: number | null;
  config: HouseholdConfig;
}

/** What `buildRecordPayment` reads. */
export interface RecordPaymentInput {
  /** The active month, `YYYY-MM`. */
  month: string;
  /** Today's date key in Asia/Singapore. */
  today: string;
  people: RecordPaymentPerson[];
  /** Unpaid charges in `month` and earlier. Paid ones, credits and later months are left out here too. */
  charges: RecordPaymentCharge[];
}

/** Who is picked and what is ticked. */
export interface RecordPaymentSelection {
  /** Null for nobody; someone not in the From list is treated as nobody. */
  personId: string | null;
  /** Ticked charge ids; ids not in the person's For list are left out. */
  ticked: string[];
}

/** An unpaid charge listed under the person who pays it. */
export interface Payable {
  charge: RecordPaymentCharge;
  /** The person it is collected through, or its own person. */
  payerId: string;
  /** e.g. `Rent · Nov`, or `Utilities · Sam · Nov` when collected through the payer. */
  title: string;
  dueDate: string | null;
}

// A person reads "upcoming" when none of their charges is overdue or due within this many days.
const UPCOMING_AFTER_DAYS = 7;

const NO_DUE = "9999-12-31";

/**
 * The charges Record payment can record, grouped under the person who pays each: the person it is
 * collected through, or the person themselves, so Priya's list carries Sam's utilities and Sam's
 * list never does. The owner's own charges, paid charges, credits and later months are left out.
 *
 * @param input - The active month, today, the people and the charges.
 * @returns Each payer's charges: the active month's first, then earlier months', each by due date
 * (none last), then title. Payers with nothing to pay are not in the map.
 */
export function payablesByPayer(input: RecordPaymentInput): Map<string, Payable[]> {
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const ownerIds = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));
  const byPayer = new Map<string, Payable[]>();
  for (const charge of input.charges) {
    if (charge.paidCents !== null || charge.amountCents <= 0 || charge.month > input.month) continue;
    const payerId = charge.payViaPersonId ?? charge.personId;
    if (ownerIds.has(charge.personId) || ownerIds.has(payerId) || !names.has(payerId)) continue;
    const routed = payerId !== charge.personId;
    const title = [charge.label, ...(routed ? [names.get(charge.personId) ?? ""] : []), formatMonthShort(charge.month)].join(" · ");
    const list = byPayer.get(payerId) ?? [];
    list.push({ charge, payerId, title, dueDate: chargeDueDate(charge.month, charge.config, charge) });
    byPayer.set(payerId, list);
  }
  for (const list of byPayer.values()) {
    list.sort(
      (a, b) =>
        b.charge.month.localeCompare(a.charge.month) ||
        (a.dueDate ?? NO_DUE).localeCompare(b.dueDate ?? NO_DUE) ||
        a.title.localeCompare(b.title),
    );
  }
  return byPayer;
}

/**
 * The Record payment sheet for the active month. Every ticked charge is paid in full, so the amount
 * is always the ticked total and is never typed in.
 *
 * @param input - The active month, today, the people and the charges.
 * @param selection - Who is picked and the ticked charge ids.
 * @returns The sheet, ready to render. With nobody left to pay it is the `Everyone has paid` state.
 */
export function buildRecordPayment(input: RecordPaymentInput, selection: RecordPaymentSelection): RecordPaymentSheet {
  const byPayer = payablesByPayer(input);
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const options = fromOptions(byPayer, names, input.today);
  const settled = options.length === 0;
  const personId = selection.personId !== null && byPayer.has(selection.personId) ? selection.personId : null;
  const payables = personId === null ? [] : (byPayer.get(personId) ?? []);
  const tickedIds = new Set(selection.ticked);
  const ticked = payables.filter((p) => tickedIds.has(p.charge.id));
  const totalCents = ticked.reduce((sum, p) => sum + p.charge.amountCents, 0);
  const total = formatCents(totalCents);

  return {
    month: input.month,
    title: "Record payment",
    subtitle: formatMonthShortLabel(input.month),
    settled: settled ? { title: "Everyone has paid", text: "No payments left to record" } : null,
    from: {
      personId,
      placeholder: settled ? "Everyone has paid" : "Select person",
      options,
    },
    for: {
      empty: personId !== null ? null : settled ? "No unpaid charges" : "Select a person first",
      count: personId === null ? null : `${ticked.length} of ${payables.length} selected`,
      rows: payables.map((p) => chargeRow(p, tickedIds.has(p.charge.id), input.today)),
    },
    amount: {
      value: total,
      expected: personId === null ? null : `Expected ${total} · ${chargeCount(ticked.length)}`,
      note: ticked.length > 1 ? "Multiple charges can only be paid in full" : null,
    },
    paidOn: input.today,
    record: {
      label: ticked.length > 0 ? `Record ${total}` : "Record payment",
      request: personId !== null && ticked.length > 0 ? { personId, chargeIds: ticked.map((p) => p.charge.id) } : null,
    },
    confirm: personId !== null && ticked.length > 0 ? confirmDialog(names.get(personId) ?? "", ticked, total) : null,
  };
}

/** The From list: most urgent first (earliest due date among their charges, none last), then by name. */
function fromOptions(byPayer: Map<string, Payable[]>, names: Map<string, string>, today: string): RecordPaymentFromOption[] {
  return [...byPayer]
    .map(([personId, payables]) => {
      const earliest = payables.reduce((min, p) => (p.dueDate !== null && p.dueDate < min ? p.dueDate : min), NO_DUE);
      const totalCents = payables.reduce((sum, p) => sum + p.charge.amountCents, 0);
      const soon = payables.some((p) => p.dueDate !== null && daysUntil(p.dueDate, today) <= UPCOMING_AFTER_DAYS);
      const option: RecordPaymentFromOption = {
        personId,
        name: names.get(personId) ?? "",
        detail: `${payables.length} ${soon ? "unpaid" : "upcoming"} · ${formatCents(totalCents)}`,
        tone: earliest < today ? "danger" : "default",
      };
      return { option, earliest };
    })
    .sort((a, b) => a.earliest.localeCompare(b.earliest) || a.option.name.localeCompare(b.option.name))
    .map((o) => o.option);
}

/** One For row: title, amount, `Due 1 Nov` and the countdown chip, or `Upcoming` with no due date. */
function chargeRow(p: Payable, ticked: boolean, today: string): RecordPaymentChargeRow {
  return {
    chargeId: p.charge.id,
    title: p.title,
    amount: formatCents(p.charge.amountCents),
    detail: p.dueDate === null ? null : `Due ${formatDateShort(p.dueDate)}`,
    chip: p.dueDate === null ? HOME_BADGES.upcoming : dueInBadge(daysUntil(p.dueDate, today)),
    ticked,
  };
}

/** `1 charge`, `3 charges`. */
function chargeCount(n: number): string {
  return n === 1 ? "1 charge" : `${n} charges`;
}

/** `Record this payment?` for the ticked charges; the app adds the Received on row. */
function confirmDialog(name: string, ticked: Payable[], total: string): RecordPaymentConfirm {
  const several = ticked.length > 1;
  return {
    title: "Record this payment?",
    body: "Check the details before recording.",
    from: { label: "From", value: name },
    for: {
      label: "For",
      value: several ? chargeCount(ticked.length) : ticked[0].title,
      items: several ? ticked.map((p) => ({ label: p.title, value: formatCents(p.charge.amountCents) })) : null,
    },
    amount: { label: "Amount received", value: total },
    receivedOnLabel: "Received on",
    confirmLabel: `Record ${total}`,
    cancelLabel: "Go back",
  };
}
