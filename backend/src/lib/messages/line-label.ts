import type { ChargeType, HouseholdConfig } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";

// What a line reads when the config has no custom label for its type. Recurring charges, one-offs
// and corrections always read their own stored label.
const DEFAULT_LINE_LABELS: Partial<Record<ChargeCategory, string>> = {
  RENT: "Rent",
  UTILITIES: "Utilities bill",
  AIRCON: "Aircon servicing",
};

/**
 * What a charge is called in a message: the custom line label for its type, then the default for
 * rent, utilities and aircon. Recurring charges, one-offs and corrections read their stored label.
 *
 * @param config - The config pinned to the message's month.
 * @param charge - The charge's category and stored label.
 * @returns The line label, e.g. `Utilities bill` or `Starhub`.
 */
export function lineLabel(config: HouseholdConfig, charge: { category: ChargeCategory; label: string }): string {
  const fallback = DEFAULT_LINE_LABELS[charge.category];
  if (!fallback) return charge.label;
  return config.templates.lineLabels[charge.category as ChargeType] ?? fallback;
}
