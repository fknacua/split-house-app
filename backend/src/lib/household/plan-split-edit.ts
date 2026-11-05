import { isDeepStrictEqual } from "node:util";
import {
  formatCents,
  formatMonthShortLabel,
  householdConfigSchema,
  type HouseholdConfig,
  type HouseholdEditGroup,
  type HouseholdEditRow,
  type HouseholdSplitAmounts,
  type HouseholdSplitEdit,
} from "@splithouse/shared";
import { amountText } from "./amount-text";
import { applySplitEdit } from "./apply-edit";
import type { ParsedVersion } from "./plan-edit";
import { splitAmounts } from "./split-amounts";
import { remaindersOf } from "./split-remainders";

/** What `planSplitEdit` reads. */
export interface SplitEditPlanInput {
  edit: HouseholdSplitEdit;
  /** Everyone's names, by person id. */
  names: Map<string, string>;
  /** The month the edit starts from: the one after the active month. */
  month: string;
  /** The version in effect at that month. */
  base: ParsedVersion;
}

/** What a Household split edit would do. The preview returns it and the save stores it. */
export interface SplitEditPlan {
  /** The new config, or null when nothing changes or the new one is invalid. */
  nextConfig: HouseholdConfig | null;
  groups: HouseholdEditGroup[];
  errors: Record<string, string>;
  warnings: Record<string, string>;
  amounts: HouseholdSplitAmounts;
  canSave: boolean;
}

const NEGATIVE_ERROR = "Enter 0 or more.";
const PERCENT_ERROR = "Enter a percentage";
const MIN_PRIMARY_BPS = 100;
const MAX_PRIMARY_BPS = 9900;

const nameOf = (names: Map<string, string>, personId: string) => names.get(personId) ?? "Someone";

/** The checks on each tenant's shares, and a warning for each one at 0. */
function tenantChecks(edit: HouseholdSplitEdit, config: HouseholdConfig, names: Map<string, string>) {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  for (const { personId, utilityShares } of edit.tenantShares) {
    const person = config.people.find((p) => p.personId === personId);
    if (person?.role !== "TENANT") {
      errors.form = "This person is no longer a tenant in the household.";
      continue;
    }
    const key = `tenantShares.${personId}`;
    const name = nameOf(names, personId);
    if (utilityShares === null) {
      errors[key] = `Enter ${name}’s shares`;
    } else if (utilityShares < 0) {
      errors[key] = NEGATIVE_ERROR;
    } else if (utilityShares === 0) {
      warnings[key] = `${name} utilities is 0`;
    }
  }
  return { errors, warnings };
}

/** The checks on the percents: an empty field always, and a changed value's range. A saved value is never refused. */
function percentErrors(edit: HouseholdSplitEdit, config: HouseholdConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  const { rent, utilities, aircon } = config.categories;
  const hasPrimary = config.people.some((p) => p.role === "PRIMARY");
  const fields = [
    ["rentPrimaryBps", edit.rentPrimaryBps, rent.primaryBps],
    ["utilitiesPrimaryBps", edit.utilitiesPrimaryBps, utilities.primaryBps],
    ["airconPrimaryBps", edit.airconPrimaryBps, aircon.primaryBps],
  ] as const;
  for (const [field, bps, saved] of fields) {
    if (bps === undefined || bps === saved) continue;
    if (!hasPrimary) errors.form = "There is no primary tenant to split with.";
    else if (bps === null || bps < MIN_PRIMARY_BPS || bps > MAX_PRIMARY_BPS) errors[field] = PERCENT_ERROR;
  }
  return errors;
}

/** The checks on the total, which needs shares left over for the owner and primary tenant. */
function totalErrors(edit: HouseholdSplitEdit, applied: HouseholdConfig, names: Map<string, string>): Record<string, string> {
  if (edit.totalShares === null || edit.totalShares === 0) return { totalShares: "Enter the total shares" };
  if (edit.totalShares !== undefined && edit.totalShares < 0) return { totalShares: NEGATIVE_ERROR };
  const { primary, shares } = remaindersOf(applied);
  if (shares.total > 0) return {};
  return {
    leftToSplit: primary ? `Nothing left to split between You and ${nameOf(names, primary.personId)}` : "Nothing left for you",
  };
}

/** One person's row, or none when the text doesn't change. */
const row = (label: string, from: string, to: string): HouseholdEditRow[] => (from === to ? [] : [{ label, from, to }]);

/** The summary rows, card by card: only what differs between the two configs. */
function summaryRows(from: HouseholdConfig, to: HouseholdConfig, names: Map<string, string>): HouseholdEditRow[] {
  const before = remaindersOf(from);
  const after = remaindersOf(to);
  const primaryName = before.primary ? nameOf(names, before.primary.personId) : null;
  const pair = (word: string, format: (value: number) => string, of: (r: typeof before) => { owner: number; primary: number }) => [
    ...row(`You · ${word}`, format(of(before).owner), format(of(after).owner)),
    ...(primaryName ? row(`${primaryName} · ${word}`, format(of(before).primary), format(of(after).primary)) : []),
  ];
  return [
    ...pair("rent", formatCents, (r) => r.rent),
    ...from.people.flatMap((person) => {
      const next = to.people.find((p) => p.personId === person.personId);
      return person.role === "TENANT" && next
        ? row(`${nameOf(names, person.personId)} · utilities`, amountText(person.utilityShares), amountText(next.utilityShares))
        : [];
    }),
    ...row("Total shares", amountText(from.categories.utilities.totalShares), amountText(to.categories.utilities.totalShares)),
    ...pair("utilities", amountText, (r) => r.shares),
    ...pair("aircon", amountText, (r) => r.units),
  ];
}

/**
 * Works out what a Household split edit would do, for the preview and the save alike. Pure: the service reads the
 * rows and stores the result. An empty field is an error here, as on Landlord & rooms, since a loaded form only gets
 * one by clearing a value. The total stays as sent, so a tenant's shares moving changes what is left to split.
 *
 * @param input - The edit, the names, the month it starts from and the version in effect.
 * @returns The new config, the summary groups, the errors and warnings per field, the amounts and whether Save is allowed.
 */
export function planSplitEdit(input: SplitEditPlanInput): SplitEditPlan {
  const { edit, names, month, base } = input;
  const applied = applySplitEdit(base.config, edit);
  const tenants = tenantChecks(edit, base.config, names);
  const errors = { ...tenants.errors, ...percentErrors(edit, base.config), ...totalErrors(edit, applied, names) };

  const groups: HouseholdEditGroup[] = [];
  let nextConfig: HouseholdConfig | null = null;
  if (Object.keys(errors).length === 0) {
    const parsed = householdConfigSchema.safeParse(applied);
    if (!parsed.success) {
      errors.form = parsed.error.issues[0].message;
    } else {
      if (!isDeepStrictEqual(parsed.data, base.config)) nextConfig = parsed.data;
      const rows = summaryRows(base.config, parsed.data, names);
      if (rows.length > 0) groups.push({ title: `Saves from ${formatMonthShortLabel(month)}`, rows });
    }
  }

  return {
    nextConfig,
    groups,
    errors,
    warnings: tenants.warnings,
    amounts: splitAmounts(applied),
    canSave: nextConfig !== null && Object.keys(errors).length === 0,
  };
}
