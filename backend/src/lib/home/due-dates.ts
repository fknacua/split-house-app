import { dateKeyOf, dueDateKey, type ChargeType, type HouseholdConfig } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";

/** A charge, as much of it as its due date needs. */
export interface DueDateCharge {
  category: ChargeCategory;
  dueDate: Date | null;
  payViaPersonId: string | null;
}

/**
 * The date a charge is due. A charge stored with no due date that is paid via someone (Sam's
 * utilities) uses that person's due day for the same charge type, as the projected row did before
 * the bill was saved. The stored charge is not changed. Home's rows and View bill's people read this.
 *
 * @param month - The charge's month, `YYYY-MM`.
 * @param config - The config pinned to the month.
 * @param charge - The charge.
 * @returns The date key, or null when no due day is known.
 */
export function chargeDueDate(month: string, config: HouseholdConfig, charge: DueDateCharge): string | null {
  if (charge.dueDate) return dateKeyOf(charge.dueDate);
  if (!charge.payViaPersonId) return null;
  const via = config.people.find((p) => p.personId === charge.payViaPersonId);
  return dueDateKey(month, via?.dueDays[charge.category as ChargeType]);
}

/**
 * The utilities bill's due date: the saved bill's own date supersedes the day in the config, which
 * is all there is before a bill is saved (or for a bill saved without one). Home and View bill read this.
 *
 * @param month - The bill's month, `YYYY-MM`.
 * @param config - The config pinned to the month.
 * @param billDueDate - The saved bill's due date, or null.
 * @returns The date key, or null when neither is known.
 */
export function billDueDateKey(month: string, config: HouseholdConfig, billDueDate: Date | null): string | null {
  return billDueDate ? dateKeyOf(billDueDate) : dueDateKey(month, config.categories.utilities.billDueDay);
}
