import { isDeepStrictEqual } from "node:util";
import {
  addMonths,
  formatCents,
  formatMonthLabel,
  formatMonthShortLabel,
  type HouseholdConfig,
  type HouseholdFact,
  type HouseholdRecurring,
  type PersonColor,
} from "@splithouse/shared";
import { runningCharges } from "./plan-recurring-edit";
import { dueLabel } from "./route-via";

/** What `buildRecurringSection` reads. */
export interface RecurringSectionInput {
  /** The month shown, `YYYY-MM`. */
  month: string;
  /** The active month: the newest opened, or the calendar month when later. */
  activeMonth: string;
  /** The config in effect for `month`. */
  config: HouseholdConfig;
  /** The config in effect next month: the latest saved values, which the sheet edits. */
  nextConfig: HouseholdConfig;
  /** Everyone's names, by person id. */
  names: Map<string, string>;
  /** Everyone's colors, by person id. */
  colors: Map<string, PersonColor>;
}

/** How far ahead End month reaches: three years of months. */
const END_MONTH_COUNT = 36;

const FALLBACK_COLOR: PersonColor = "SLATE";

/**
 * The Recurring tab for one month and the sheet that edits the latest saved values, display-ready.
 *
 * @param input - The month shown, the active month, the two configs, the names and the colors.
 * @returns The `recurring` part of `GET /api/household`.
 */
export function buildRecurringSection(input: RecurringSectionInput): HouseholdRecurring {
  const { month, activeMonth, config, nextConfig, names, colors } = input;
  const nextMonth = addMonths(activeMonth, 1);
  const nameOf = (personId: string) => names.get(personId) ?? "Someone";
  const nextLabel = formatMonthLabel(nextMonth);
  const charges = runningCharges(nextConfig, nextMonth);
  const isEditable = new Set(charges.map((charge) => charge.id));
  const isPending = month === activeMonth && !isDeepStrictEqual(config.recurring, nextConfig.recurring);
  const payers = [
    ...nextConfig.people.filter((p) => p.role === "PRIMARY"),
    ...nextConfig.people.filter((p) => p.role === "TENANT"),
  ];

  const facts = (charge: HouseholdConfig["recurring"][number]): HouseholdFact[] => {
    const person = config.people.find((p) => p.personId === charge.personId);
    return [
      { label: "Charge", value: charge.label },
      { label: person ? dueLabel(config, person, "UTILITIES", "Amount") : "Amount", value: formatCents(charge.amountCents) },
      ...(charge.endMonth ? [{ label: "Until", value: formatMonthShortLabel(charge.endMonth) }] : []),
    ];
  };

  return {
    title: "Recurring charges",
    pendingNote: isPending ? `Saved changes take effect from ${nextLabel}.` : null,
    rows: runningCharges(config, month).map((charge) => ({
      chargeId: charge.id,
      initial: (Array.from(nameOf(charge.personId).trim())[0] ?? "?").toUpperCase(),
      name: nameOf(charge.personId),
      color: colors.get(charge.personId) ?? FALLBACK_COLOR,
      facts: facts(charge),
      actions: isEditable.has(charge.id) ? [{ label: "Edit", target: { kind: "edit-recurring", chargeId: charge.id } }] : [],
    })),
    emptyText: "No recurring charges",
    add: { label: "Add charge", target: { kind: "add-recurring" } },
    sheet: {
      addTitle: "Add recurring charge",
      editTitle: "Edit recurring charge",
      datedTitle: `From ${nextLabel}`,
      people: payers.map((p) => ({ personId: p.personId, name: nameOf(p.personId) })),
      endMonths: Array.from({ length: END_MONTH_COUNT }, (_, i) => addMonths(nextMonth, i)),
      charges: charges.map((charge) => ({
        chargeId: charge.id,
        label: charge.label,
        amountCents: charge.amountCents,
        personId: charge.personId,
        endMonth: charge.endMonth ?? null,
        removeDialog: {
          title: `Remove ${charge.label}?`,
          body: `${charge.label} stops from ${nextLabel}. Past months stay as they are.`,
        },
      })),
    },
  };
}
