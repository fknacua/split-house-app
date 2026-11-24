import { formatMonthShort, type LineLabelType, type MessageTemplates } from "@splithouse/shared";
import type { ChargeCategory } from "@/generated/prisma/enums";

/**
 * What a line reads when there is no custom label for its type. Recurring charges and one-offs always read their
 * own stored label; a correction reads the label of what it fixes (`lineLabel`).
 */
export const DEFAULT_LINE_LABELS: Record<LineLabelType, string> = {
  RENT: "Rent",
  UTILITIES: "Utilities bill",
  AIRCON: "Aircon servicing",
};

const hasLineLabel = (category: ChargeCategory): category is LineLabelType => category in DEFAULT_LINE_LABELS;

/** A charge, as much of it as its line label needs. */
export interface LineLabelCharge {
  category: ChargeCategory;
  label: string;
  /** A correction's: what it fixes. Left out (or null) for any other charge. */
  correctsCategory?: ChargeCategory | null;
  /** A correction's: the month it fixes. */
  correctsMonth?: string | null;
}

/**
 * What a charge is called in a message: the custom line label for its type, then the default for
 * rent, utilities and aircon. Recurring charges and one-offs read their stored label. A correction is
 * named from what it fixes, `{line label} correction ({Mon})`: the line label of utilities or aircon,
 * so a custom one carries over, e.g. `Utilities bill correction (Oct)`; a one-off's stored label
 * already reads that way (`Fridge repair correction (Oct)`), as does one with no link.
 *
 * @param templates - The message wording.
 * @param charge - The charge's category, stored label and, for a correction, what it fixes.
 * @returns The line label, e.g. `Utilities bill` or `Starhub`.
 */
export function lineLabel(templates: MessageTemplates, charge: LineLabelCharge): string {
  if (charge.category === "CORRECTION") {
    const fixed = charge.correctsCategory;
    if (!fixed || !charge.correctsMonth || !hasLineLabel(fixed)) return charge.label;
    return `${templates.lineLabels[fixed] ?? DEFAULT_LINE_LABELS[fixed]} correction (${formatMonthShort(charge.correctsMonth)})`;
  }
  if (!hasLineLabel(charge.category)) return charge.label;
  return templates.lineLabels[charge.category] ?? DEFAULT_LINE_LABELS[charge.category];
}
