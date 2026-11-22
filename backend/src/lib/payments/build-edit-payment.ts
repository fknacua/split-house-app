import {
  dateKeyOf,
  formatCents,
  formatMonthShortLabel,
  type EditPaymentSheet,
  type HomeAction,
} from "@splithouse/shared";

/** A charge, as much of it as Edit payment needs. */
export interface EditPaymentCharge {
  id: string;
  month: string;
  personId: string;
  payViaPersonId: string | null;
  label: string;
  amountCents: number;
  paidCents: number | null;
  paidOn: Date | null;
  paidByPersonId: string | null;
}

/**
 * Whether a charge's payment can be edited or removed: it is paid, it is not the owner's own charge
 * (those are never payments to anyone), and it is above zero (a refund correction is history, and
 * Phase 13C gives it its own footer).
 *
 * @param charge - The charge's amount and paid fields.
 * @param isOwner - Whether the charge is the owner's own.
 * @returns True when Edit payment applies.
 */
export function isPaymentEditable(
  charge: Pick<EditPaymentCharge, "amountCents" | "paidCents">,
  isOwner: boolean,
): boolean {
  return charge.paidCents !== null && !isOwner && charge.amountCents > 0;
}

/**
 * The Edit payment button for Charge details' footer.
 *
 * @param chargeId - The paid charge.
 * @returns An outline button with the pencil icon that opens the sheet.
 */
export function editPaymentAction(chargeId: string): HomeAction {
  return { label: "Edit payment", tone: "outline", icon: "pencil", target: { kind: "edit-payment", chargeId } };
}

/**
 * Builds the Edit payment sheet for one paid charge: From (who paid: the stored payer, else the
 * person it is collected through, else its own person), For (the charge and its month, naming the
 * person when it is collected through someone else), Amount received (what was paid, always the
 * full amount), the stored Received on, and the Remove payment dialog. Pure: no database, no clock.
 *
 * @param charge - The paid charge.
 * @param names - Every person's name by id.
 * @param today - Date key of today in Singapore; Received on falls back to it if no day was stored.
 * @returns The sheet, ready to render.
 */
export function buildEditPayment(
  charge: EditPaymentCharge,
  names: Map<string, string>,
  today: string,
): EditPaymentSheet {
  const payerId = charge.paidByPersonId ?? charge.payViaPersonId ?? charge.personId;
  const person = names.get(charge.personId) ?? "";
  const monthLabel = formatMonthShortLabel(charge.month);
  const forValue =
    payerId === charge.personId ? `${charge.label} · ${monthLabel}` : `${charge.label} · ${person} · ${monthLabel}`;

  return {
    chargeId: charge.id,
    month: charge.month,
    title: "Edit payment",
    subtitle: monthLabel,
    rows: [
      { label: "From", value: names.get(payerId) ?? "" },
      { label: "For", value: forValue },
      { label: "Amount received", value: formatCents(charge.paidCents ?? charge.amountCents) },
    ],
    paidOn: charge.paidOn ? dateKeyOf(charge.paidOn) : today,
    remove: {
      label: "Remove payment",
      confirm: {
        title: "Remove this payment?",
        body: `${charge.label} · ${person} will show as unpaid again.`,
        confirmLabel: "Remove",
        cancelLabel: "Keep",
      },
    },
  };
}
