import {
  dateKeyOf,
  formatCents,
  formatDateShort,
  formatMonthName,
  type ChargePaymentResponse,
  type HouseholdConfig,
  type PaymentSheetDue,
} from "@splithouse/shared";
import { chargeDueDate } from "@/lib/home/due-dates";
import type { ChargeCategory } from "@/generated/prisma/enums";

/** A charge, as much of it as the payment sheet needs. */
export interface PaymentSheetChargeRow {
  id: string;
  month: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  payViaPersonId: string | null;
  paidCents: number | null;
  paidOn: Date | null;
  person: { name: string };
}

/** What `buildPaymentSheet` reads. */
export interface PaymentSheetInput {
  /** Today's date key in Asia/Singapore. */
  today: string;
  /** The config pinned to the charge's month, for a via charge's due day. */
  config: HouseholdConfig;
  charge: PaymentSheetChargeRow;
  /** `mark` (default) for Mark paid from a row, `record` for Record payment's wording. */
  mode?: "mark" | "record";
}

/**
 * The payment sheet for one charge. An unpaid charge is filled in with its expected amount and
 * today; a paid one with the stored amount and day, so Edit payment (7.9) opens on what was saved.
 * Record payment words the title, subtitle and button its own way; the rest is the same.
 *
 * @param input - Today, the pinned config, the charge with its person's name, and the mode.
 * @returns The sheet, ready to render.
 */
export function buildPaymentSheet(input: PaymentSheetInput): ChargePaymentResponse {
  const { charge, today } = input;
  const stored =
    charge.paidCents !== null && charge.paidOn !== null
      ? { cents: charge.paidCents, on: dateKeyOf(charge.paidOn) }
      : null;
  const amountCents = stored?.cents ?? charge.amountCents;
  const monthName = formatMonthName(charge.month);
  const words =
    input.mode === "record"
      ? {
          title: "Record payment",
          subtitle: `Money you received for ${monthName}`,
          actionLabel: `Record ${formatCents(amountCents)}`,
        }
      : {
          title: "Mark paid",
          subtitle: `${charge.label} · ${charge.person.name} · ${monthName}`,
          actionLabel: "Mark as paid",
        };
  return {
    chargeId: charge.id,
    month: charge.month,
    title: words.title,
    subtitle: words.subtitle,
    expected: formatCents(charge.amountCents),
    expectedCents: charge.amountCents,
    due: dueRow(chargeDueDate(charge.month, input.config, charge), today, stored !== null),
    amountCents,
    paidOn: stored?.on ?? today,
    actionLabel: words.actionLabel,
  };
}

/** `7 Nov`, or `Overdue since 1 Nov` in danger while an unpaid charge is past its due date. */
function dueRow(dueDate: string | null, today: string, paid: boolean): PaymentSheetDue | null {
  if (dueDate === null) return null;
  const short = formatDateShort(dueDate);
  return !paid && dueDate < today
    ? { text: `Overdue since ${short}`, tone: "danger" }
    : { text: short, tone: "default" };
}
