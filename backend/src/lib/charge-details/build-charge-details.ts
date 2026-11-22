import {
  dateKeyOf,
  daysUntil,
  formatCents,
  formatDatePadded,
  formatMonthLabel,
  type ChargeDetailsActivity,
  type ChargeDetailsFact,
  type ChargeDetailsResponse,
  type HomeStatus,
  type HouseholdConfig,
} from "@splithouse/shared";
import type { ChargeCategory, MessageKind } from "@/generated/prisma/enums";
import { chargeBadge, HOME_BADGES } from "@/lib/home/badges";
import { chargeActions } from "@/lib/home/charge-actions";
import { chargeDueDate } from "@/lib/home/due-dates";
import { editPaymentAction, isPaymentEditable } from "@/lib/payments/build-edit-payment";

/** The charge, as much of it as Charge details needs. */
export interface ChargeDetailsCharge {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  dueDate: Date | null;
  paidCents: number | null;
  paidOn: Date | null;
}

/** A WhatsApp chat opened for someone, as much of it as the Activity card needs. */
export interface ChargeDetailsMessage {
  personId: string;
  kind: MessageKind;
  /** The charge a nudge is about. Null for a monthly message. */
  chargeId: string | null;
  openedAt: Date;
}

/** Everything `buildChargeDetails` works from. */
export interface ChargeDetailsInput {
  /** Date key of today in Singapore. */
  today: string;
  /** The config pinned to the charge. */
  config: HouseholdConfig;
  charge: ChargeDetailsCharge;
  /** At least the person who owes the charge and the person it is via. */
  people: { id: string; name: string; isOwner: boolean }[];
  /** The month's message events; only the payer's monthly messages and this charge's nudges are used. */
  messages: ChargeDetailsMessage[];
  /** Where the charge's month is in its cycle. Only `collecting` matters, for the due-today note. */
  monthStatus: HomeStatus;
  /** The charge is not in a message that went out, by Home's rule (`isChargeUnsent`), so its chip is `Not sent`. */
  messageUnsent: boolean;
}

/** An Activity line with what it sorts by: its day, then a payment before a chat on the same day, then the time. */
interface DatedActivity {
  line: ChargeDetailsActivity;
  day: string;
  isPayment: boolean;
  time: number;
}

/**
 * The Activity lines, newest first: each monthly message opened for the payer this month, each
 * nudge about this charge, and the payment with the amount applied to this charge. A payment has
 * only a day, so it sorts above the chats of that day.
 */
function activity(input: ChargeDetailsInput, payerId: string): ChargeDetailsActivity[] {
  const { charge } = input;
  const dated: DatedActivity[] = input.messages
    .filter((m) => (m.kind === "MONTHLY" ? m.personId === payerId : m.chargeId === charge.id))
    .map((m) => {
      const day = dateKeyOf(m.openedAt);
      return {
        line: { title: m.kind === "MONTHLY" ? "Monthly message sent" : "Nudged", date: formatDatePadded(day) },
        day,
        isPayment: false,
        time: m.openedAt.getTime(),
      };
    });
  if (charge.paidCents !== null && charge.paidOn) {
    const day = dateKeyOf(charge.paidOn);
    dated.push({
      line: { title: `Payment ${formatCents(charge.paidCents)}`, date: formatDatePadded(day) },
      day,
      isPayment: true,
      time: 0,
    });
  }
  dated.sort(
    (a, b) => b.day.localeCompare(a.day) || Number(b.isPayment) - Number(a.isPayment) || b.time - a.time,
  );
  return dated.map((d) => d.line);
}

/**
 * Builds Charge details for one charge: the amount card with the charge's Home chip, the Details
 * rows, the Activity, and the footer. The chip and the footer follow the Home row's rules
 * (`chargeBadge`, `chargeActions`), so both screens agree; a paid charge gets Edit payment instead
 * (`isPaymentEditable`). The owner's own charges are not payments to anyone, so they have no footer.
 *
 * @param input - Today, the pinned config, the charge, the people it names and the month's messages.
 * @returns The response, ready to render.
 */
export function buildChargeDetails(input: ChargeDetailsInput): ChargeDetailsResponse {
  const { charge, config, today } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const isOwner = input.people.some((p) => p.id === charge.personId && p.isOwner);
  const payerId = charge.payViaPersonId ?? charge.personId;
  const paid = charge.paidCents !== null;
  const sent = input.messages.some((m) => m.kind === "MONTHLY" && m.personId === payerId);
  const dueDate = chargeDueDate(charge.month, config, charge);
  const days = dueDate === null ? null : daysUntil(dueDate, today);

  const chip = chargeBadge({
    paid,
    messageUnsent: input.messageUnsent,
    days,
    sent,
  });
  const overdue = !paid && chip.tone === "danger";
  const dueToday = !paid && chip === HOME_BADGES.dueToday;

  const facts: ChargeDetailsFact[] = [
    { kind: "text", label: "Payer", value: names.get(charge.personId) ?? "" },
    {
      kind: "text",
      label: "Payment routing",
      value: charge.payViaPersonId ? `Via ${names.get(charge.payViaPersonId)}` : "Direct",
    },
    ...(dueDate === null ? [] : [{ kind: "text", label: "Due", value: formatDatePadded(dueDate) } as const]),
    { kind: "pill", label: "Payment status", badge: paid ? HOME_BADGES.paid : HOME_BADGES.unpaid },
  ];

  return {
    chargeId: charge.id,
    month: charge.month,
    title: `${charge.label} · ${names.get(charge.personId)}`,
    monthName: formatMonthLabel(charge.month),
    amount: {
      value: formatCents(charge.amountCents),
      chip,
      // The same line as the Home row's, while the month is collecting.
      note:
        dueToday && input.monthStatus === "collecting"
          ? "You’ll get a payment check tonight if it’s still unpaid."
          : null,
    },
    facts,
    activity: activity(input, payerId),
    footer: isOwner
      ? []
      : isPaymentEditable(charge, isOwner)
        ? [editPaymentAction(charge.id)]
        : chargeActions({
          chargeId: charge.id,
          month: charge.month,
          payerId,
          routed: charge.payViaPersonId !== null,
          paid,
          overdue,
          sent,
          nudged: input.messages.some((m) => m.kind === "NUDGE" && m.chargeId === charge.id),
        }),
  };
}
