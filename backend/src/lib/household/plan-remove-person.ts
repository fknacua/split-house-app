import { householdConfigSchema, type HouseholdConfig } from "@splithouse/shared";
import { applyRemovePerson } from "./apply-edit";
import { withPrimarySplit } from "./first-setup";
import { hasPayersVia } from "./route-via";

/** What removing a person would do. The preview returns it and the save stores it. */
export interface RemovePersonPlan {
  /** The new config, or null when they cannot be removed. */
  nextConfig: HouseholdConfig | null;
  errors: Record<string, string>;
  canSave: boolean;
}

/** Options for `planRemovePerson`. */
export interface RemovePersonOptions {
  /** True in First run, where the primary tenant can be removed too. */
  firstSetup?: boolean;
}

/**
 * Works out what removing a person would do, for the preview and the save alike. Refused while someone else
 * pays via them, since that person's charge would have nobody to go through. Only a tenant can be removed, except
 * in First run, where the primary tenant can be too, and the owner then takes all of every split again.
 *
 * @param personId - The person, who is in the config.
 * @param config - The config they leave.
 * @param options - Whether First run is on.
 * @returns The new config, the errors and whether Save is allowed.
 */
export function planRemovePerson(personId: string, config: HouseholdConfig, options: RemovePersonOptions = {}): RemovePersonPlan {
  const refuse = (form: string): RemovePersonPlan => ({ nextConfig: null, errors: { form }, canSave: false });

  const role = config.people.find((p) => p.personId === personId)?.role;
  const isPrimary = role === "PRIMARY" && (options.firstSetup ?? false);
  if (role !== "TENANT" && !isPrimary) {
    return refuse("Only tenants can be removed.");
  }
  if (hasPayersVia(config.people, personId)) {
    return refuse("This person has payment routed to them. Please redirect the payment before removing.");
  }

  const removed = applyRemovePerson(config, personId);
  const parsed = householdConfigSchema.safeParse(isPrimary ? withPrimarySplit(removed, 0) : removed);
  if (!parsed.success) return refuse(parsed.error.issues[0].message);
  return { nextConfig: parsed.data, errors: {}, canSave: true };
}
