import {
  formatCents,
  formatDateMedium,
  formatMonthShort,
  formatMonthShortLabel,
  type AddChargeConfirm,
  type AddChargePreview,
  type AddCorrectionPersonOption,
  type AddCorrectionValues,
  type PersonConfig,
} from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";
import {
  correctionFields,
  correctionRefusal,
  type CorrectionFields,
  type CorrectionOriginal,
  type CorrectionRefusal,
} from "@/lib/corrections/correction-fields";
import { viaOf } from "@/lib/household/route-via";
import type { AddChargeInput, AddChargeProblem } from "./build-add-charge";

/** A charge as Correction mode reads it, with the corrections already linked to it. */
export interface CorrectableCharge {
  id: string;
  month: string;
  personId: string;
  category: ChargeCategory;
  label: string;
  amountCents: number;
  payViaPersonId: string | null;
  paidCents: number | null;
  paidByPersonId: string | null;
  /** The amounts of every correction linked to it, signed. */
  correctionCents: number[];
}

/** What Correction mode reads: the newest opened month as Add charge reads it, today, and the charges to correct. */
export interface CorrectionInput extends AddChargeInput {
  /** `YYYY-MM-DD`: the refund's date and the higher one's opening due date. */
  today: string;
  /**
   * Charges that may be corrected, from any month. Only the ones that can be ({@link correctionRefusal}) of people in
   * the month's household are offered; the rest are ignored.
   */
  charges: CorrectableCharge[];
}

/** The correction charge to store, besides the month, version and creation time the save adds. */
export interface CorrectionCharge extends CorrectionFields {
  personId: string;
  payViaPersonId: string | null;
  label: string;
  /** The difference: below 0 for a refund, above 0 for an extra charge. */
  amountCents: number;
  dueDate: string;
  /** A refund is saved already paid; an extra charge is unpaid (all three null). */
  paidCents: number | null;
  paidOn: string | null;
  paidByPersonId: string | null;
}

/** Utilities, then aircon, then one-off charges: the Charge Select's order. */
const CATEGORY_RANK: Partial<Record<ChargeCategory, number>> = { UTILITIES: 0, AIRCON: 1, ONE_OFF: 2 };

/** The message the save's 409 carries for each refusal, whose name is its code. */
const REFUSALS: Record<CorrectionRefusal, string> = {
  is_correction: "A correction can’t be corrected itself.",
  owner_charge: "Your own charges are never collected, so they can’t be corrected.",
  not_correctable: "Rent and recurring charges are fixed in Household, from next month on.",
  unpaid: "Only a paid charge can be corrected.",
};

function ownerIdOf(input: Pick<AddChargeInput, "config">): string {
  return input.config.people.find((p) => p.role === "OWNER")?.personId ?? "";
}

function personOf(input: Pick<AddChargeInput, "config">, personId: string): PersonConfig | undefined {
  return input.config.people.find((p) => p.personId === personId && p.role !== "OWNER");
}

function nameOf(input: AddChargeInput, personId: string): string {
  return input.people.find((p) => p.id === personId)?.name ?? "Someone";
}

/**
 * A charge's amount now: the original plus every correction linked to it.
 *
 * @param charge - The charge.
 * @returns The amount in cents.
 */
export function currentCents(charge: CorrectableCharge): number {
  return charge.correctionCents.reduce((sum, c) => sum + c, charge.amountCents);
}

/** The charges Correction mode offers: ones that can be corrected, of people in the month's household. */
function offered(input: CorrectionInput): CorrectableCharge[] {
  const ownerId = ownerIdOf(input);
  return input.charges.filter((c) => correctionRefusal(c, ownerId) === null && personOf(input, c.personId) !== undefined);
}

/**
 * The offered charge with this id, or null when it isn't one (unknown, or one that can't be corrected).
 *
 * @param input - The month, its config, the people and the charges.
 * @param chargeId - The picked charge, or null.
 * @returns The charge, or null.
 */
export function findCorrectable(input: CorrectionInput, chargeId: string | null): CorrectableCharge | null {
  return chargeId === null ? null : (offered(input).find((c) => c.id === chargeId) ?? null);
}

/**
 * The Person, Month and Charge Selects: everyone in the month's household except the owner who has a charge that
 * can be corrected, in household order, their months newest first, and in each month utilities, aircon then one-off
 * charges, each labelled with its current amount.
 *
 * @param input - The month, its config, the people and the charges.
 * @returns The people, each with their months and charges.
 */
export function correctionPeople(input: CorrectionInput): AddCorrectionPersonOption[] {
  const charges = offered(input);
  return input.config.people.flatMap((person) => {
    const own = charges.filter((c) => c.personId === person.personId);
    if (own.length === 0) return [];
    const months = [...new Set(own.map((c) => c.month))].sort((a, b) => b.localeCompare(a));
    return [
      {
        personId: person.personId,
        name: nameOf(input, person.personId),
        months: months.map((month) => ({
          month,
          label: formatMonthShortLabel(month),
          charges: own
            .filter((c) => c.month === month)
            .sort((a, b) => (CATEGORY_RANK[a.category] ?? 9) - (CATEGORY_RANK[b.category] ?? 9) || a.label.localeCompare(b.label))
            .map((c) => ({ chargeId: c.id, label: `${c.label} · ${formatCents(currentCents(c))}` })),
        })),
      },
    ];
  });
}

/**
 * Correction mode's fields as the sheet opens: nothing picked and the Due date today, or, opened from a charge, that
 * charge, its person and its month picked.
 *
 * @param today - `YYYY-MM-DD`.
 * @param from - The charge `Add correction` was tapped on, or null.
 * @returns The fields.
 */
export function openingCorrectionValues(today: string, from: CorrectableCharge | null): AddCorrectionValues {
  return { personId: from?.personId ?? null, month: from?.month ?? null, chargeId: from?.id ?? null, amountCents: null, dueDate: today };
}

/** Who pays a refund back to: whoever paid the original. */
function refundPayer(charge: CorrectableCharge): string {
  return charge.paidByPersonId ?? charge.payViaPersonId ?? charge.personId;
}

/** The route an extra charge is collected through: the month's household's, aircon's for aircon and utilities' otherwise. */
function extraVia(input: AddChargeInput, charge: CorrectableCharge): string | null {
  const person = personOf(input, charge.personId);
  return person ? viaOf(person, charge.category === "AIRCON" ? "AIRCON" : "UTILITIES") : null;
}

/** The difference the correct amount makes, or null while it is empty, below $0 or unchanged. */
function differenceOf(charge: CorrectableCharge, amountCents: number | null): number | null {
  if (amountCents === null || amountCents < 0) return null;
  const diff = amountCents - currentCents(charge);
  return diff === 0 ? null : diff;
}

/** The outcome as the sheet's Alert says it, naming who it is for and the payer of a routed one. */
function outcomeText(input: AddChargeInput, charge: CorrectableCharge, diff: number): string {
  const name = nameOf(input, charge.personId);
  if (diff > 0) {
    const via = extraVia(input, charge);
    return `Adds a ${formatCents(diff)} charge for ${name}${via ? ` · via ${nameOf(input, via)}` : ""}`;
  }
  const payer = refundPayer(charge);
  const to = payer === charge.personId ? name : `${nameOf(input, payer)} (for ${name})`;
  return `Refund ${formatCents(-diff)} to ${to} yourself. This is saved as history.`;
}

/**
 * The confirm dialog's Outcome row: just the amount, since its For row names the charge and person, e.g. `Adds $5.00`
 * or `Refunds $5.00`. A routed one still names its payer (`Refunds $5.00 to Priya`, `Adds $5.00 · via Priya`).
 */
function outcomeRow(input: AddChargeInput, charge: CorrectableCharge, diff: number): string {
  if (diff > 0) {
    const via = extraVia(input, charge);
    return `Adds ${formatCents(diff)}${via ? ` · via ${nameOf(input, via)}` : ""}`;
  }
  const payer = refundPayer(charge);
  return `Refunds ${formatCents(-diff)}${payer === charge.personId ? "" : ` to ${nameOf(input, payer)}`}`;
}

/**
 * Why a charge can't be corrected from the newest month's sheet, or null when it can. The GET checks a charge it is opened
 * from with it, the save the picked one, and Charge details whether to offer Add correction.
 *
 * @param input - The newest opened month's config.
 * @param charge - The charge as read from the database (whether or not it can be corrected), or null when there is none.
 * @returns 404 `no_charge` (no such charge); 409 `is_correction`, `owner_charge`, `not_correctable` or `unpaid`
 * ({@link correctionRefusal}); 404 `no_person` (the person isn't in the month's household); or null.
 */
export function correctionChargeProblem(
  input: Pick<AddChargeInput, "config">,
  charge: CorrectionOriginal | null,
): AddChargeProblem | null {
  if (charge === null) return { status: 404, code: "no_charge", message: "That charge doesn’t exist." };
  const refusal = correctionRefusal(charge, ownerIdOf(input));
  if (refusal !== null) return { status: 409, code: refusal, message: REFUSALS[refusal] };
  if (personOf(input, charge.personId) === undefined) {
    return { status: 404, code: "no_person", message: "That person isn’t in this month’s household." };
  }
  return null;
}

/**
 * The first reason a correction can't be saved, in the sheet's order, or null when it can.
 *
 * @param input - The month, its config, the people and today.
 * @param values - Correction mode's fields.
 * @param charge - The charge `values.chargeId` names, as read from the database (whether or not it can be corrected),
 * or null when there is none.
 * @returns 422 `no_pick` (no charge picked); a {@link correctionChargeProblem}; 422 `no_amount`, `negative_amount`,
 * `unchanged`, or `no_date` (a higher amount with no due date); or null.
 */
export function addCorrectionProblem(
  input: AddChargeInput,
  values: AddCorrectionValues,
  charge: CorrectableCharge | null,
): AddChargeProblem | null {
  const unprocessable = (code: string, message: string): AddChargeProblem => ({ status: 422, code, message });
  if (values.chargeId === null) return unprocessable("no_pick", "Pick the charge to correct.");
  const chargeProblem = correctionChargeProblem(input, charge);
  if (chargeProblem !== null || charge === null) return chargeProblem;
  const { amountCents, dueDate } = values;
  if (amountCents === null) return unprocessable("no_amount", "Enter the correct amount.");
  if (amountCents < 0) return unprocessable("negative_amount", "The correct amount can’t be below $0.00.");
  if (amountCents === currentCents(charge)) return unprocessable("unchanged", "That’s the amount it is now.");
  if (amountCents > currentCents(charge) && dueDate === null) return unprocessable("no_date", "Pick a due date.");
  return null;
}

/**
 * The correction to store for fields that passed {@link addCorrectionProblem}. A refund is saved already paid, today,
 * by whoever paid the original, through the original's route; an extra charge is unpaid, due on the picked date,
 * through the month's household's route. Both are labelled from what they fix, e.g. `Utilities correction (Oct)`.
 *
 * @param input - The month, its config, the people and today.
 * @param values - Correction mode's fields.
 * @param charge - The charge to correct.
 * @returns The charge to store.
 * @throws {Error} When the fields would not pass {@link addCorrectionProblem}.
 */
export function buildCorrectionCharge(
  input: CorrectionInput,
  values: AddCorrectionValues,
  charge: CorrectableCharge,
): CorrectionCharge {
  const diff = differenceOf(charge, values.amountCents);
  if (diff === null || addCorrectionProblem(input, values, charge) !== null) {
    throw new Error(`Correction fields for charge ${charge.id} don't pass the checks`);
  }
  const base = {
    ...correctionFields(charge, ownerIdOf(input)),
    personId: charge.personId,
    label: `${charge.label} correction (${formatMonthShort(charge.month)})`,
    amountCents: diff,
  };
  if (diff < 0) {
    return { ...base, payViaPersonId: charge.payViaPersonId, dueDate: input.today, paidCents: diff, paidOn: input.today, paidByPersonId: refundPayer(charge) };
  }
  return { ...base, payViaPersonId: extraVia(input, charge), dueDate: values.dueDate ?? input.today, paidCents: null, paidOn: null, paidByPersonId: null };
}

/** The `Add this correction?` dialog. */
function confirmFor(input: AddChargeInput, values: AddCorrectionValues, charge: CorrectableCharge, diff: number): AddChargeConfirm {
  const row = (label: string, value: string) => ({ label, value, items: null });
  const rows = [
    row("For", `${charge.label} · ${nameOf(input, charge.personId)} · ${formatMonthShortLabel(charge.month)}`),
    row("New amount", formatCents(values.amountCents ?? 0)),
    row("Outcome", outcomeRow(input, charge, diff)),
  ];
  if (diff > 0 && values.dueDate !== null) rows.push(row("Due date", formatDateMedium(values.dueDate)));
  return {
    title: "Add this correction?",
    body: "It will be linked to the original charge.",
    rows,
    confirmLabel: "Yes, add it",
    cancelLabel: "Go back",
  };
}

/**
 * Everything in Correction mode that follows from the fields as they stand: how many times the picked charge was
 * corrected (under the Charge field, whose option already shows its current amount), the outcome Alert, whether the
 * amount and Due date can be changed, Save and the confirm dialog. A charge that isn't offered counts as none picked.
 * Nothing is stored.
 *
 * @param input - The month, its config, the people, today and the charges.
 * @param values - Correction mode's fields.
 * @returns The preview, with the Charge-mode parts empty.
 */
export function buildCorrectionPreview(input: CorrectionInput, values: AddCorrectionValues): AddChargePreview {
  const charge = findCorrectable(input, values.chargeId);
  const diff = charge === null ? null : differenceOf(charge, values.amountCents);
  const count = charge?.correctionCents.length ?? 0;
  const canSave = charge !== null && addCorrectionProblem(input, values, charge) === null && diff !== null;
  return {
    show: { label: false, scope: false, who: false, split: false },
    preview: null,
    custom: null,
    shares: null,
    correction: {
      corrections: count === 0 ? null : `${count} ${count === 1 ? "correction" : "corrections"}`,
      outcome: charge === null || diff === null ? null : outcomeText(input, charge, diff),
      amountEnabled: charge !== null,
      dueDateEnabled: diff !== null && diff > 0,
    },
    save: { label: "Save", enabled: canSave },
    confirm: canSave && charge !== null && diff !== null ? confirmFor(input, values, charge, diff) : null,
  };
}
