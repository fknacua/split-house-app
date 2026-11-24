import type { ChargeCategory } from "@/generated/prisma/enums";

/**
 * The categories a correction can fix. Rent and recurring charges are fixed in Household from next month on.
 */
export const CORRECTABLE_CATEGORIES = ["UTILITIES", "AIRCON", "ONE_OFF"] as const satisfies readonly ChargeCategory[];

/** A category a correction can fix. */
export type CorrectableCategory = (typeof CORRECTABLE_CATEGORIES)[number];

/** The facts about a charge that decide whether it can be corrected. */
export interface CorrectionOriginal {
  id: string;
  month: string;
  personId: string;
  category: ChargeCategory;
  paidCents: number | null;
}

/**
 * Why a charge can't be corrected: it is a correction itself (never corrected), the owner's (never paid), rent
 * or recurring, or not paid yet.
 */
export type CorrectionRefusal = "is_correction" | "owner_charge" | "not_correctable" | "unpaid";

/** The fields every `CORRECTION` charge stores about what it fixes, as the `charge_correction_fields` CHECK requires. */
export interface CorrectionFields {
  correctsChargeId: string;
  correctsMonth: string;
  correctsCategory: CorrectableCategory;
}

/**
 * Whether a charge is a refund: a correction below zero, which the user paid back and is saved already paid. It is
 * history only, never in a message or in Record payment.
 *
 * @param charge - The charge's category and amount.
 * @returns True for a refund.
 */
export function isRefund(charge: { category: ChargeCategory; amountCents: number }): boolean {
  return charge.category === "CORRECTION" && charge.amountCents < 0;
}

function isCorrectable(category: ChargeCategory): category is CorrectableCategory {
  return (CORRECTABLE_CATEGORIES as readonly ChargeCategory[]).includes(category);
}

/**
 * Whether a charge can be corrected, checked in the order the refusals are listed on {@link CorrectionRefusal}.
 *
 * @param original The charge to correct.
 * @param ownerId The owner's person id.
 * @returns Why it can't be corrected, or `null` when it can.
 */
export function correctionRefusal(original: CorrectionOriginal, ownerId: string): CorrectionRefusal | null {
  if (original.category === "CORRECTION") return "is_correction";
  if (original.personId === ownerId) return "owner_charge";
  if (!isCorrectable(original.category)) return "not_correctable";
  if (original.paidCents === null) return "unpaid";
  return null;
}

/**
 * The correction fields for a correction of `original`, copied from it. The one place that builds them, so every
 * write of a correction stores what the database CHECK expects.
 *
 * @param original The charge to correct.
 * @param ownerId The owner's person id.
 * @returns The link to the charge and its month and category.
 * @throws {Error} When the charge can't be corrected ({@link correctionRefusal}); check that first to answer a request.
 */
export function correctionFields(original: CorrectionOriginal, ownerId: string): CorrectionFields {
  const refusal = correctionRefusal(original, ownerId);
  if (refusal !== null || !isCorrectable(original.category)) {
    throw new Error(`Charge ${original.id} can't be corrected: ${refusal ?? "not_correctable"}`);
  }
  return { correctsChargeId: original.id, correctsMonth: original.month, correctsCategory: original.category };
}
