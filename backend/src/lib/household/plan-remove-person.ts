import { householdConfigSchema, type HouseholdConfig } from "@splithouse/shared";
import { applyRemovePerson } from "./apply-edit";
import { hasPayersVia } from "./route-via";

/** What removing a person would do. The preview returns it and the save stores it. */
export interface RemovePersonPlan {
  /** The new config, or null when they cannot be removed. */
  nextConfig: HouseholdConfig | null;
  errors: Record<string, string>;
  canSave: boolean;
}

/**
 * Works out what removing a tenant would do, for the preview and the save alike. Refused while someone else
 * pays via them, since that person's charge would have nobody to go through.
 *
 * @param personId - The person, who is in the config.
 * @param config - The config in effect next month.
 * @returns The new config, the errors and whether Save is allowed.
 */
export function planRemovePerson(personId: string, config: HouseholdConfig): RemovePersonPlan {
  const refuse = (form: string): RemovePersonPlan => ({ nextConfig: null, errors: { form }, canSave: false });

  if (config.people.find((p) => p.personId === personId)?.role !== "TENANT") {
    return refuse("Only tenants can be removed.");
  }
  if (hasPayersVia(config.people, personId)) {
    return refuse("This person has payment routed to them. Please redirect the payment before removing.");
  }

  const parsed = householdConfigSchema.safeParse(applyRemovePerson(config, personId));
  if (!parsed.success) return refuse(parsed.error.issues[0].message);
  return { nextConfig: parsed.data, errors: {}, canSave: true };
}
