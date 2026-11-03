import { isDeepStrictEqual } from "node:util";
import {
  e164Phone,
  formatCents,
  formatDayOrdinal,
  formatMonthShortLabel,
  householdConfigSchema,
  requiredText,
  type HouseholdConfig,
  type HouseholdEdit,
  type HouseholdEditGroup,
  type HouseholdEditRow,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { amountText } from "./amount-text";
import { applyHouseholdEdit } from "./apply-edit";
import { personColorName } from "./person-color";

/** A version with its config parsed. */
export interface ParsedVersion {
  startsFromMonth: string;
  config: HouseholdConfig;
}

/** The `Person` row's fields an edit can read. */
export interface EditPerson {
  id: string;
  name: string;
  whatsappE164: string | null;
  color: PersonColor;
  isOwner: boolean;
}

/** What `planHouseholdEdit` reads. */
export interface HouseholdEditPlanInput {
  edit: HouseholdEdit;
  person: EditPerson;
  /** The month dated values start from: the one after the active month. */
  month: string;
  /** The version in effect at that month, with the person in it. */
  base: ParsedVersion;
}

/** What an edit would do. The preview returns it and the save stores it. */
export interface HouseholdEditPlan {
  /** The `Person` fields that change. */
  personChanges: { name?: string; whatsappE164?: string | null; color?: PersonColor };
  /** The new config, or null when no dated value changes or the new one is invalid. */
  nextConfig: HouseholdConfig | null;
  groups: HouseholdEditGroup[];
  errors: Record<string, string>;
  canSave: boolean;
}

const NONE = "—";
const SPLIT_ERROR = "This comes from the split.";
const AMOUNT_FIELDS = ["rentCents", "utilityShares", "airconUnits", "depositCents"] as const;

/**
 * Finds the version in effect at a month.
 *
 * @param versions - The versions, in any order.
 * @param month - The month, `YYYY-MM`.
 * @returns The newest version starting on or before the month, or null.
 */
export function versionInEffect(versions: ParsedVersion[], month: string): ParsedVersion | null {
  const sorted = [...versions].sort((a, b) => a.startsFromMonth.localeCompare(b.startsFromMonth));
  return sorted.findLast((v) => v.startsFromMonth <= month) ?? null;
}

/** The checks on the dated values. Errors here keep the edit from being applied. */
function datedFieldErrors(edit: HouseholdEdit, person: PersonConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of AMOUNT_FIELDS) {
    const value = edit[field];
    if (value === undefined) continue;
    if (person.role !== "TENANT" && value !== person[field]) errors[field] = SPLIT_ERROR;
    else if (value < 0) errors[field] = "Enter 0 or more.";
  }
  const days = [
    ["rentDueDay", edit.rentDueDay, "RENT"],
    ["utilitiesDueDay", edit.utilitiesDueDay, "UTILITIES"],
  ] as const;
  for (const [field, day, type] of days) {
    if (day === undefined) continue;
    if (day === null) {
      // Someone paying via another person has no due day of their own, but a direct payer needs theirs.
      const direct = person.routes[type]?.kind !== "VIA";
      if (direct && person.dueDays[type] !== undefined) errors[field] = "Enter a day from 1 to 31.";
    } else if (day < 1 || day > 31) {
      errors[field] = "Enter a day from 1 to 31.";
    }
  }
  return errors;
}

/** The checks on the `Person` fields, and what changes on the row. */
function planPersonChanges(edit: HouseholdEdit, person: EditPerson) {
  const errors: Record<string, string> = {};
  const changes: HouseholdEditPlan["personChanges"] = {};
  const rows: HouseholdEditRow[] = [];

  if (edit.name !== undefined) {
    const name = requiredText.safeParse(edit.name);
    if (!name.success) {
      errors.name = "Enter a name.";
    } else if (name.data !== person.name) {
      changes.name = name.data;
      rows.push({ label: "Name", from: person.name, to: name.data });
    }
  }
  if (edit.whatsappE164 !== undefined) {
    const number = edit.whatsappE164 === null ? null : e164Phone.safeParse(edit.whatsappE164);
    if (number && !number.success) {
      errors.whatsappE164 = "Enter a valid phone number.";
    } else if (edit.whatsappE164 !== person.whatsappE164) {
      changes.whatsappE164 = edit.whatsappE164;
      rows.push({ label: "WhatsApp", from: person.whatsappE164 ?? NONE, to: edit.whatsappE164 ?? NONE });
    }
  }
  if (edit.color !== undefined && edit.color !== person.color) {
    if (edit.color === "TEAL" && !person.isOwner) {
      errors.color = "Teal is only for you.";
    } else {
      changes.color = edit.color;
      rows.push({ label: "Color", from: personColorName(person.color), to: personColorName(edit.color) });
    }
  }
  return { errors, changes, rows };
}

/** Maps a config check to the field it belongs to. */
function configErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { path, message } of issues) {
    const field =
      path[1] === "utilities" ? "utilityShares" : path[1] === "aircon" ? "airconUnits" : "form";
    errors[field] ??= message;
  }
  return errors;
}

const dayText = (day: number | undefined) => (day ? formatDayOrdinal(day) : NONE);
const depositText = (cents: number) => (cents ? formatCents(cents) : "None");

/** The dated rows: only what differs between the two configs' entries for the person. */
function datedRows(from: PersonConfig, to: PersonConfig): HouseholdEditRow[] {
  const rows: HouseholdEditRow[] = [
    { label: "Rent", from: formatCents(from.rentCents), to: formatCents(to.rentCents) },
    { label: "Rent due", from: dayText(from.dueDays.RENT), to: dayText(to.dueDays.RENT) },
    { label: "Utility shares", from: amountText(from.utilityShares), to: amountText(to.utilityShares) },
    { label: "Utilities due", from: dayText(from.dueDays.UTILITIES), to: dayText(to.dueDays.UTILITIES) },
    { label: "Aircon units", from: String(from.airconUnits), to: String(to.airconUnits) },
    { label: "Deposit", from: depositText(from.depositCents), to: depositText(to.depositCents) },
  ];
  return rows.filter((row) => row.from !== row.to);
}

/**
 * Works out what an edit would do, for the preview and the save alike. Pure: the service reads the
 * rows and stores the result.
 *
 * The summary compares the saved values with the new ones, so it lists only what this edit changes.
 *
 * @param input - The edit, the person, the month dated values start from and the version in effect.
 * @returns The changes, the summary groups, the errors per field and whether Save is allowed.
 */
export function planHouseholdEdit(input: HouseholdEditPlanInput): HouseholdEditPlan {
  const { edit, person, month, base } = input;
  const inBase = base.config.people.find((p) => p.personId === edit.personId);
  if (!inBase) throw new Error("The person is not in the version");

  const immediate = planPersonChanges(edit, person);
  const errors = { ...immediate.errors, ...datedFieldErrors(edit, inBase) };
  const groups: HouseholdEditGroup[] = [];
  if (immediate.rows.length > 0) groups.push({ title: "Saves now", rows: immediate.rows });

  let nextConfig: HouseholdConfig | null = null;
  const datedInvalid = AMOUNT_FIELDS.some((f) => errors[f]) || !!errors.rentDueDay || !!errors.utilitiesDueDay;
  if (!datedInvalid) {
    const parsed = householdConfigSchema.safeParse(applyHouseholdEdit(base.config, edit));
    if (!parsed.success) {
      Object.assign(errors, configErrors(parsed.error.issues));
    } else {
      if (!isDeepStrictEqual(parsed.data, base.config)) nextConfig = parsed.data;
      const next = parsed.data.people.find((p) => p.personId === edit.personId) ?? inBase;
      const rows = datedRows(inBase, next);
      if (rows.length > 0) groups.push({ title: `Saves from ${formatMonthShortLabel(month)}`, rows });
    }
  }

  const hasChanges = nextConfig !== null || Object.keys(immediate.changes).length > 0;

  return {
    personChanges: immediate.changes,
    nextConfig,
    groups,
    errors,
    canSave: hasChanges && Object.keys(errors).length === 0,
  };
}
