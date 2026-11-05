import type { LineLabelType, MessageTemplates } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";

/**
 * What a line reads when there is no custom label for its type. Recurring charges, one-offs and corrections
 * always read their own stored label.
 */
export const DEFAULT_LINE_LABELS: Record<LineLabelType, string> = {
  RENT: "Rent",
  UTILITIES: "Utilities bill",
  AIRCON: "Aircon servicing",
};

const hasLineLabel = (category: ChargeCategory): category is LineLabelType => category in DEFAULT_LINE_LABELS;

/**
 * What a charge is called in a message: the custom line label for its type, then the default for
 * rent, utilities and aircon. Recurring charges, one-offs and corrections read their stored label.
 *
 * @param templates - The message wording.
 * @param charge - The charge's category and stored label.
 * @returns The line label, e.g. `Utilities bill` or `Starhub`.
 */
export function lineLabel(templates: MessageTemplates, charge: { category: ChargeCategory; label: string }): string {
  if (!hasLineLabel(charge.category)) return charge.label;
  return templates.lineLabels[charge.category] ?? DEFAULT_LINE_LABELS[charge.category];
}
