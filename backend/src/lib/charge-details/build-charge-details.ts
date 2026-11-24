import {
  dateKeyOf,
  daysUntil,
  formatCents,
  formatDatePadded,
  formatDateShort,
  formatMonthLabel,
  formatMonthShortLabel,
  type ChargeDetailsActivity,
  type ChargeDetailsFact,
  type ChargeDetailsResponse,
  type HomeAction,
  type HomeStatus,
  type HouseholdConfig,
} from "@splithouse/shared";
import type { ChargeCategory, MessageKind } from "@/generated/prisma/enums";
import { isRefund } from "@/lib/corrections/correction-fields";
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
  /** For a correction, the charge it fixes; null for any other charge. */
  fixes: { label: string; month: string } | null;
  /** The corrections made to this charge, each with its signed amount and when it was added. */
  corrections: { amountCents: number; createdAt: Date }[];
  /** The charge can be corrected from the newest month's Add charge sheet (`correctionChargeProblem` finds nothing). */
  canCorrect: boolean;
}

/** The Add correction button: opens the Add charge sheet as `Add correction` for this charge. */
function addCorrectionAction(chargeId: string): HomeAction {
  return { label: "Add correction", tone: "outline", icon: "plus", target: { kind: "add-correction", chargeId } };
}

/** The Delete correction button: opens its confirm dialog. */
function deleteCorrectionAction(chargeId: string): HomeAction {
  return { label: "Delete correction", tone: "outline-danger", icon: "trash", target: { kind: "delete-correction", chargeId } };
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
 * nudge about this charge, each correction made to it, and the payment with the amount applied to
 * this charge. A payment has only a day, so it sorts above the chats of that day. A refund has only
 * its own line: it is never in a message.
 */
function activity(input: ChargeDetailsInput, payerId: string): ChargeDetailsActivity[] {
  const { charge } = input;
  if (isRefund(charge)) {
    if (!charge.paidOn) return [];
    return [{ title: `Refund ${formatCents(charge.amountCents)}`, date: formatDatePadded(dateKeyOf(charge.paidOn)) }];
  }
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
  for (const correction of input.corrections) {
    const day = dateKeyOf(correction.createdAt);
    dated.push({
      line: { title: `Correction ${formatCents(correction.amountCents)}`, date: formatDatePadded(day) },
      day,
      isPayment: false,
      time: correction.createdAt.getTime(),
    });
  }
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

/** The card note on a corrected charge, e.g. `Corrected to $X.XX · 1 correction`; null when it has none. */
function correctedNote(input: ChargeDetailsInput): string | null {
  const count = input.corrections.length;
  if (count === 0) return null;
  const current = input.corrections.reduce((sum, c) => sum + c.amountCents, input.charge.amountCents);
  return `Corrected to ${formatCents(current)} · ${count} ${count === 1 ? "correction" : "corrections"}`;
}

/** The `Delete this correction?` dialog, naming the charge it fixes. */
function deleteDialog(input: ChargeDetailsInput, name: string): NonNullable<ChargeDetailsResponse["deleteCorrection"]> {
  const from = input.fixes ? `${input.fixes.label} · ${name}` : "its charge";
  const payment = input.charge.paidCents !== null ? " Its payment is removed too." : "";
  return {
    title: "Delete this correction?",
    body: `It’s removed from ${from} and from History.${payment}`,
    confirmLabel: "Delete",
    cancelLabel: "Keep",
  };
}

/**
 * Builds Charge details for one charge: the amount card with the charge's Home chip, the Details
 * rows, the Activity, and the footer. The chip and the footer follow the Home row's rules
 * (`chargeBadge`, `chargeActions`), so both screens agree; a paid charge gets Edit payment instead
 * (`isPaymentEditable`), then Add correction when it can be corrected. A correction is titled
 * `Correction · <person>`, names what it fixes and ends its footer with Delete correction; a refund is
 * `Refunded`, has no Due row and has only Delete correction. The owner's own charges are not payments
 * to anyone, so they have no footer.
 *
 * @param input - Today, the pinned config, the charge, the people it names, the month's messages, and
 * what it fixes or the corrections made to it.
 * @returns The response, ready to render.
 */
export function buildChargeDetails(input: ChargeDetailsInput): ChargeDetailsResponse {
  const { charge, config, today } = input;
  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const name = names.get(charge.personId) ?? "";
  const isOwner = input.people.some((p) => p.id === charge.personId && p.isOwner);
  const isCorrection = charge.category === "CORRECTION";
  const refund = isRefund(charge);
  const payerId = charge.payViaPersonId ?? charge.personId;
  const paid = charge.paidCents !== null;
  const sent = input.messages.some((m) => m.kind === "MONTHLY" && m.personId === payerId);
  const dueDate = refund ? null : chargeDueDate(charge.month, config, charge);
  const days = dueDate === null ? null : daysUntil(dueDate, today);

  const chip = chargeBadge({
    refund,
    paid,
    messageUnsent: input.messageUnsent,
    days,
    sent,
  });
  const overdue = !paid && chip.tone === "danger";
  const dueToday = !paid && chip === HOME_BADGES.dueToday;

  const status = refund
    ? { label: charge.paidOn ? `Refunded ${formatDateShort(dateKeyOf(charge.paidOn))}` : "Refunded", tone: "success" as const }
    : paid
      ? HOME_BADGES.paid
      : HOME_BADGES.unpaid;
  const facts: ChargeDetailsFact[] = [
    { kind: "text", label: "Payer", value: name },
    {
      kind: "text",
      label: "Payment routing",
      value: charge.payViaPersonId ? `Via ${names.get(charge.payViaPersonId)}` : "Direct",
    },
    ...(input.fixes
      ? [{ kind: "text", label: "Fixes", value: `${input.fixes.label} · ${formatMonthShortLabel(input.fixes.month)}` } as const]
      : []),
    ...(dueDate === null ? [] : [{ kind: "text", label: "Due", value: formatDatePadded(dueDate) } as const]),
    { kind: "pill", label: "Payment status", badge: status },
  ];

  const payActions = isPaymentEditable(charge, isOwner)
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
      });
  let footer: HomeAction[];
  if (isOwner) footer = [];
  else if (refund) footer = [deleteCorrectionAction(charge.id)];
  else if (isCorrection) footer = [...payActions, deleteCorrectionAction(charge.id)];
  else footer = [...payActions, ...(input.canCorrect ? [addCorrectionAction(charge.id)] : [])];

  return {
    chargeId: charge.id,
    month: charge.month,
    title: isCorrection ? `Correction · ${name}` : `${charge.label} · ${name}`,
    monthName: formatMonthLabel(charge.month),
    amount: {
      value: formatCents(charge.amountCents),
      chip,
      // The same line as the Home row's, while the month is collecting.
      note:
        dueToday && input.monthStatus === "collecting"
          ? "You’ll get a payment check tonight if it’s still unpaid."
          : correctedNote(input),
    },
    facts,
    activity: activity(input, payerId),
    footer,
    deleteCorrection: isCorrection && !isOwner ? deleteDialog(input, name) : null,
  };
}
