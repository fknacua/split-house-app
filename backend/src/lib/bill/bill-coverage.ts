import type { ChargeCategory } from "@/generated/prisma/enums";

/** A charge, as much of it as the coverage needs. */
export interface CoverageCharge {
  personId: string;
  category: ChargeCategory;
  amountCents: number;
  paidCents: number | null;
}

/** How much of the bill the household has covered: the user's own share plus what the others have paid. */
export interface BillCoverage {
  /** Never more than the bill. */
  coveredCents: number;
  totalCents: number;
  /** Utilities charges of people other than the owner, and how many of them are paid. */
  othersTotal: number;
  othersPaid: number;
}

/**
 * Works out how much of the utilities bill is covered so far. The user's own utilities share
 * counts as covered from the start; each other person's counts once paid, and a payment over the
 * amount covers no more than the charge. Home's bill row and hero and View bill all read this.
 *
 * @param charges - The month's charges. Only utilities charges are counted.
 * @param ownerIds - The user's person id (a set, as the builders keep it).
 * @param currentChargesCents - The bill's Current Charges.
 * @returns The covered amount, capped at the bill, and how many of the others have paid.
 */
export function billCoverage(
  charges: CoverageCharge[],
  ownerIds: Set<string>,
  currentChargesCents: number,
): BillCoverage {
  const utilities = charges.filter((c) => c.category === "UTILITIES");
  const own = utilities.filter((c) => ownerIds.has(c.personId));
  const others = utilities.filter((c) => !ownerIds.has(c.personId));
  const paid = others.reduce((sum, c) => sum + Math.min(c.paidCents ?? 0, c.amountCents), 0);
  const coveredCents = own.reduce((sum, c) => sum + c.amountCents, 0) + paid;
  return {
    coveredCents: Math.min(coveredCents, currentChargesCents),
    totalCents: currentChargesCents,
    othersTotal: others.length,
    othersPaid: others.filter((c) => c.paidCents !== null).length,
  };
}

/**
 * The coverage as a whole percentage, for a progress bar.
 *
 * @param coverage - From {@link billCoverage}.
 * @returns 0 to 100, rounded; 0 for a bill of zero.
 */
export function coveragePercent(coverage: BillCoverage): number {
  return coverage.totalCents === 0 ? 0 : Math.round((coverage.coveredCents / coverage.totalCents) * 100);
}
