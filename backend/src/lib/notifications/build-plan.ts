import {
  addMonths,
  currentMonth,
  formatCents,
  formatDateShort,
  formatMonthName,
  formatMonthShort,
  type HomeTarget,
  type HouseholdConfig,
  type NotificationAction,
  type NotificationToggles,
  type PlannedNotification,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import { correctionName, type CorrectedCharge } from "@/lib/corrections/correction-name";
import { billDueDateKey, chargeDueDate } from "@/lib/home/due-dates";

/** Morning reminders (upload, collect rent, pay bill) go out at 9:00 Singapore time. */
const MORNING = "09:00:00";

/** Payment checks go out at 20:00 on the due date: Home's note says "tonight" (deviation R4). */
const EVENING = "20:00:00";

/** The upload reminder's text: one body, the shade's (deviation R1). */
const UPLOAD_TITLE = "Upload this month’s utilities bill";
const UPLOAD_BODY = "It usually lands around the 2nd. Tap to upload it.";

/** Categories a payment check names by their label in lower case (`Nov utilities`); others keep it as written. */
const LOWER_CASE_LABELS: ReadonlySet<ChargeCategory> = new Set(["RENT", "UTILITIES", "AIRCON"]);

/** Someone in the household, as much as the plan needs. */
export interface PlanPerson {
  id: string;
  name: string;
  isOwner: boolean;
}

/** An opened month and the config pinned to it, for due days. */
export interface PlanMonth {
  month: string;
  config: HouseholdConfig;
}

/** An unpaid charge, as much of it as the plan needs. */
export interface PlanCharge {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  /** What a correction fixes; null for any other charge. */
  correctsCharge: CorrectedCharge | null;
}

/** A saved utilities bill and its month's utilities charges. */
export interface PlanBill {
  month: string;
  currentChargesCents: number;
  dueDate: Date | null;
  /** Set once the bill is marked paid (Pay bill). */
  paidCents: number | null;
  utilities: { personId: string; amountCents: number; paidCents: number | null }[];
}

/** Everything the plan is built from. */
export interface PlanInput {
  /** The moment the plan is built; nothing at or before it is planned. */
  now: Date;
  toggles: NotificationToggles;
  people: PlanPerson[];
  /** Every opened month. With none, First run hasn't finished and nothing is planned. */
  months: PlanMonth[];
  /** Every unpaid charge, of any month. */
  unpaidCharges: PlanCharge[];
  /** Every bill not marked paid, and the bills of this calendar month and next if saved. */
  bills: PlanBill[];
}

/**
 * Builds the four dated notifications from now to the end of next month, following the toggles: Upload the utilities
 * bill, Collect rent, Pay the utilities bill and Payment checks. Times are Asia/Singapore. Only charges of someone
 * other than the owner above zero count, so a refund never appears. Pure.
 *
 * @param input - The moment, the toggles and the data.
 * @returns The notifications in time order (then by id), each with a stable id.
 */
export function buildNotificationPlan(input: PlanInput): PlannedNotification[] {
  if (input.months.length === 0) return [];

  const calendar = currentMonth(input.now);
  const end = new Date(`${addMonths(calendar, 2)}-01T00:00:00+08:00`);
  const owners = new Set(input.people.filter((p) => p.isOwner).map((p) => p.id));
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const configs = new Map(input.months.map((m) => [m.month, m.config]));
  const charges = input.unpaidCharges.filter((c) => !owners.has(c.personId) && c.amountCents > 0);
  const name = (id: string) => names.get(id) ?? "Someone";

  const planned: PlannedNotification[] = [];
  if (input.toggles.uploadBill) planned.push(...uploadReminders(calendar, input.bills));
  if (input.toggles.collectRent) planned.push(...collectRent(charges, name));
  if (input.toggles.payBill) planned.push(...payBill(input.bills, configs, owners));
  if (input.toggles.paymentChecks) planned.push(...paymentChecks(charges, configs, name));

  return planned
    .filter((n) => {
      const at = new Date(n.at);
      return at > input.now && at < end;
    })
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.id.localeCompare(b.id));
}

/** 9:00 daily from the 2nd to the month's end, for this calendar month and next, unless its bill is saved. */
function uploadReminders(calendar: string, bills: PlanBill[]): PlannedNotification[] {
  const saved = new Set(bills.map((b) => b.month));
  return [calendar, addMonths(calendar, 1)]
    .filter((month) => !saved.has(month))
    .flatMap((month) =>
      daysOf(month)
        .filter((day) => day >= `${month}-02`)
        .map((day) => ({
          id: `upload:${day}`,
          channel: "action" as const,
          title: UPLOAD_TITLE,
          body: UPLOAD_BODY,
          at: at(day, MORNING),
          tap: { kind: "bill-upload" as const, month },
          actions: [],
        })),
    );
}

/** 9:00 on the last weekday of the rent's month, one per unpaid rent charge. */
function collectRent(charges: PlanCharge[], name: (id: string) => string): PlannedNotification[] {
  return charges
    .filter((c) => c.category === "RENT")
    .map((c) => {
      const day = lastWeekdayOf(c.month);
      const whose = name(c.personId);
      const friday = weekdayOf(day) === 5 ? " Weekend transfers can be slow." : "";
      return {
        id: `rent:${c.id}`,
        channel: "action" as const,
        title: c.payViaPersonId ? `Collect ${whose}’s rent from ${name(c.payViaPersonId)}` : `Collect ${whose}’s rent`,
        body: `Their ${formatMonthName(c.month)} rent of ${formatCents(c.amountCents)} is still unpaid.${friday}`,
        at: at(day, MORNING),
        tap: null,
        actions: paidAndNudge(c),
      };
    });
}

/** 9:00 the day before each unpaid bill's due date, with what the others have paid of their utilities. */
function payBill(bills: PlanBill[], configs: Map<string, HouseholdConfig>, owners: Set<string>): PlannedNotification[] {
  return bills.flatMap((bill) => {
    const config = configs.get(bill.month);
    if (bill.paidCents !== null || !config) return [];
    const due = billDueDateKey(bill.month, config, bill.dueDate);
    if (!due) return [];
    const collected = bill.utilities
      .filter((c) => !owners.has(c.personId) && c.paidCents !== null)
      .reduce((sum, c) => sum + Math.min(c.paidCents ?? 0, c.amountCents), 0);
    return [
      {
        id: `pay-bill:${bill.month}`,
        channel: "action" as const,
        title: `Pay utilities bill: collected ${formatCents(collected)} of ${formatCents(bill.currentChargesCents)}`,
        body: `Due ${formatDateShort(due)}.`,
        at: at(addDays(due, -1), MORNING),
        tap: null,
        actions: [],
      },
    ];
  });
}

/** 20:00 on each unpaid charge's due date, naming the payer and, for a routed charge, whose it is. */
function paymentChecks(
  charges: PlanCharge[],
  configs: Map<string, HouseholdConfig>,
  name: (id: string) => string,
): PlannedNotification[] {
  return charges.flatMap((c) => {
    const config = configs.get(c.month);
    const due = config ? chargeDueDate(c.month, config, c) : null;
    if (!due) return [];
    const payer = name(c.payViaPersonId ?? c.personId);
    const forWhom = c.payViaPersonId ? ` for ${name(c.personId)}` : "";
    return [
      {
        id: `check:${c.id}`,
        channel: "checks" as const,
        title: `Did ${payer} pay ${checkName(c)}${forWhom} (${formatCents(c.amountCents)})?`,
        body: "Due today.",
        at: at(due, EVENING),
        tap: null,
        actions: paidAndNudge(c),
      },
    ];
  });
}

/**
 * How a payment check names a charge: `Nov utilities`, `Nov Starhub`, or a correction's short name
 * (`Correction · Utilities Sep`), which already says its month.
 */
function checkName(charge: PlanCharge): string {
  const correction = correctionName(charge.correctsCharge);
  if (correction) return correction;
  const label = LOWER_CASE_LABELS.has(charge.category) ? charge.label.toLowerCase() : charge.label;
  return `${formatMonthShort(charge.month)} ${label}`;
}

/** Paid opens Record payment with the charge ticked; Nudge opens the Send sheet for whoever pays it. */
function paidAndNudge(charge: PlanCharge): NotificationAction[] {
  const paid: HomeTarget = { kind: "mark-paid", chargeId: charge.id };
  const nudge: HomeTarget = {
    kind: "send-nudge",
    personId: charge.payViaPersonId ?? charge.personId,
    chargeId: charge.id,
  };
  return [
    { kind: "paid", target: paid },
    { kind: "nudge", target: nudge },
  ];
}

/** A date key and a time as an ISO string with the Singapore offset. */
function at(day: string, time: string): string {
  return `${day}T${time}+08:00`;
}

/** Every date key of a month, in order. */
function daysOf(month: string): string[] {
  const [year, monthIndex] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/** The last Monday to Friday of a month; public holidays are not counted. */
function lastWeekdayOf(month: string): string {
  const days = daysOf(month);
  return days.findLast((day) => weekdayOf(day) >= 1 && weekdayOf(day) <= 5) ?? days[days.length - 1];
}

/** The day of the week of a date key, 0 for Sunday to 6 for Saturday. */
function weekdayOf(day: string): number {
  return toUtc(day).getUTCDay();
}

/** A date key moved by some days. */
function addDays(day: string, delta: number): string {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** A date key as midnight UTC, for calendar arithmetic only. */
function toUtc(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}
