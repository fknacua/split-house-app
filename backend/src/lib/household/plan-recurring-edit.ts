import { isDeepStrictEqual } from "node:util";
import {
  formatCents,
  formatMonthShortLabel,
  householdConfigSchema,
  type HouseholdConfig,
  type HouseholdEditGroup,
  type HouseholdEditRow,
  type HouseholdRecurringEdit,
} from "@splithouse/shared";
import { applyRecurringCharge } from "./apply-edit";
import type { ParsedVersion } from "./plan-edit";

type RecurringCharge = HouseholdConfig["recurring"][number];

/** What `planRecurringEdit` reads. */
export interface RecurringEditPlanInput {
  edit: HouseholdRecurringEdit;
  /** Everyone's names, by person id. */
  names: Map<string, string>;
  /** The month the edit starts from: the one after the active month. */
  month: string;
  /** The version in effect at that month. */
  base: ParsedVersion;
  /** The id a new charge takes. */
  newChargeId: string;
}

/** What a recurring charge edit would do. The preview returns it and the save stores it. */
export interface RecurringEditPlan {
  /** The new config, or null when nothing changes, a required field is empty or anything is invalid. */
  nextConfig: HouseholdConfig | null;
  groups: HouseholdEditGroup[];
  errors: Record<string, string>;
  canSave: boolean;
}

/**
 * The charges a config still has running in a month. An end month is the last month charged.
 *
 * @param config - The config.
 * @param month - The month, `YYYY-MM`.
 * @returns The charges, in saved order.
 */
export function runningCharges(config: HouseholdConfig, month: string): RecurringCharge[] {
  return config.recurring.filter((r) => !r.endMonth || month <= r.endMonth);
}

const nameOf = (names: Map<string, string>, personId: string) => names.get(personId) ?? "Someone";

const endMonthText = (endMonth: string | undefined) => (endMonth ? formatMonthShortLabel(endMonth) : "None");

/** The checks on each field. A new charge's empty field is no error, so an untouched sheet stays calm. */
function fieldErrors({ edit, names, month, base }: RecurringEditPlanInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const isSaved = edit.chargeId !== null;
  const label = edit.label.trim();

  if (label === "" && isSaved) errors.label = "Enter a label.";
  if (edit.amountCents === null ? isSaved : edit.amountCents <= 0) errors.amountCents = "Enter an amount.";
  if (edit.personId !== null) {
    const person = base.config.people.find((p) => p.personId === edit.personId);
    if (!person || person.role === "OWNER") errors.personId = "Choose someone.";
  } else if (isSaved) {
    errors.personId = "Choose someone.";
  }
  if (edit.endMonth !== null && edit.endMonth < month) errors.endMonth = "Choose next month or later.";

  // Two lines reading the same in one message would look like a mistake.
  const isTaken = runningCharges(base.config, month).some(
    (r) => r.id !== edit.chargeId && r.personId === edit.personId && r.label.toLowerCase() === label.toLowerCase(),
  );
  if (isTaken && edit.personId !== null) {
    errors.label = `${nameOf(names, edit.personId)} already has a charge called ${label}.`;
  }
  return errors;
}

/** The summary rows for a saved charge: only what differs. */
function summaryRows(from: RecurringCharge, to: RecurringCharge, names: Map<string, string>): HouseholdEditRow[] {
  const rows: HouseholdEditRow[] = [
    { label: "Label", from: from.label, to: to.label },
    { label: "Amount", from: formatCents(from.amountCents), to: formatCents(to.amountCents) },
    { label: "Who", from: nameOf(names, from.personId), to: nameOf(names, to.personId) },
    { label: "End month", from: endMonthText(from.endMonth), to: endMonthText(to.endMonth) },
  ];
  return rows.filter((row) => row.from !== row.to);
}

/**
 * Works out what adding or changing a recurring charge would do, for the preview and the save alike. Pure: the service
 * reads the version and stores the result. Adding has no summary, since the sheet is the summary, as on Add subtenant.
 *
 * @param input - The edit, the names, the month it starts from, the version in effect and a new charge's id.
 * @returns The new config, the summary groups, the errors per field and whether Save is allowed.
 */
export function planRecurringEdit(input: RecurringEditPlanInput): RecurringEditPlan {
  const { edit, names, month, base, newChargeId } = input;
  const errors = fieldErrors(input);
  const label = edit.label.trim();
  const isComplete = label !== "" && edit.amountCents !== null && edit.personId !== null;
  if (!isComplete || Object.keys(errors).length > 0) return { nextConfig: null, groups: [], errors, canSave: false };

  const charge: RecurringCharge = {
    id: edit.chargeId ?? newChargeId,
    label,
    amountCents: edit.amountCents as number,
    personId: edit.personId as string,
    ...(edit.endMonth ? { endMonth: edit.endMonth } : {}),
  };
  const parsed = householdConfigSchema.safeParse(applyRecurringCharge(base.config, charge));
  if (!parsed.success) {
    return { nextConfig: null, groups: [], errors: { form: parsed.error.issues[0].message }, canSave: false };
  }

  const saved = base.config.recurring.find((r) => r.id === edit.chargeId);
  const rows = saved ? summaryRows(saved, charge, names) : [];
  const nextConfig = isDeepStrictEqual(parsed.data, base.config) ? null : parsed.data;
  return {
    nextConfig,
    groups: rows.length > 0 ? [{ title: `Saves from ${formatMonthShortLabel(month)}`, rows }] : [],
    errors,
    canSave: nextConfig !== null,
  };
}

/**
 * Works out what stopping a recurring charge from next month would do. Charges already created stay, since a month
 * stores its own.
 *
 * @param config - The config in effect next month.
 * @param chargeId - The charge, which is in the config.
 * @returns The new config, the errors and whether Save is allowed.
 */
export function planRemoveRecurring(config: HouseholdConfig, chargeId: string): Omit<RecurringEditPlan, "groups"> {
  const parsed = householdConfigSchema.safeParse({ ...config, recurring: config.recurring.filter((r) => r.id !== chargeId) });
  if (!parsed.success) {
    return { nextConfig: null, errors: { form: parsed.error.issues[0].message }, canSave: false };
  }
  return { nextConfig: parsed.data, errors: {}, canSave: true };
}
