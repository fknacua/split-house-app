import { householdConfigSchema, requiredText, type HouseholdAddPersonEdit, type HouseholdConfig, type PersonConfig } from "@splithouse/shared";
import { applyAddPerson, applyPersonEdit } from "./apply-edit";
import { datedFieldErrors, planPersonChanges } from "./plan-edit";

/** What adding a person would do. The preview returns it and the save stores it. */
export interface AddPersonPlan {
  /** The trimmed name, or null while it is empty. */
  name: string | null;
  /** The new config, or null while a required field is empty or anything is invalid. */
  nextConfig: HouseholdConfig | null;
  errors: Record<string, string>;
  canSave: boolean;
}

/** The checks on the shares and units, which `datedFieldErrors` does not know, since an edit no longer sends them. */
function countErrors(edit: HouseholdAddPersonEdit, config: HouseholdConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (edit.utilityShares !== null && edit.utilityShares < 0) errors.utilityShares = "Enter 0 or more.";
  if (edit.airconUnits !== null) {
    const taken = config.people.reduce((sum, p) => sum + p.airconUnits, 0);
    const left = config.categories.aircon.totalUnits - taken;
    if (edit.airconUnits < 0) errors.airconUnits = "Enter 0 or more.";
    else if (edit.airconUnits > left) errors.airconUnits = "Invalid entry.";
  }
  return errors;
}

/**
 * Works out what adding a tenant would do, for the preview and the save alike. Pure: the service reads the
 * version and stores the result. An empty required field is no error, it only keeps Save disabled, so the
 * form stays calm until something typed is wrong.
 *
 * @param edit - The new tenant.
 * @param personId - The id the new `Person` row will take.
 * @param config - The config in effect next month.
 * @returns The name, the new config, the errors per field and whether Save is allowed.
 */
export function planAddPerson(edit: HouseholdAddPersonEdit, personId: string, config: HouseholdConfig): AddPersonPlan {
  const blank: PersonConfig = {
    personId,
    role: "TENANT",
    rentCents: 0,
    utilityShares: 0,
    airconUnits: 0,
    routes: {},
    dueDays: {},
    depositCents: 0,
  };
  const { rentCents, utilityShares, airconUnits, ...rest } = edit;
  const name = requiredText.safeParse(edit.name);
  // The same shape as an edit to a tenant with nothing yet, so the same rules apply.
  const asPersonEdit = {
    ...rest,
    kind: "person" as const,
    personId,
    name: name.success ? name.data : undefined,
    rentCents: rentCents ?? undefined,
  };

  const errors = {
    ...planPersonChanges(asPersonEdit, { id: personId, name: "", whatsappE164: null, color: "BLUE", isOwner: false }).errors,
    ...datedFieldErrors(asPersonEdit, blank, config.people),
    ...countErrors(edit, config),
  };

  const complete =
    name.success &&
    rentCents !== null &&
    utilityShares !== null &&
    airconUnits !== null &&
    (edit.rentViaPersonId !== null || edit.rentDueDay !== null) &&
    (edit.utilitiesViaPersonId !== null || edit.utilitiesDueDay !== null);

  let nextConfig: HouseholdConfig | null = null;
  if (complete && Object.keys(errors).length === 0) {
    const tenant = { ...applyPersonEdit(blank, asPersonEdit), utilityShares, airconUnits };
    const parsed = householdConfigSchema.safeParse(applyAddPerson(config, tenant));
    if (parsed.success) nextConfig = parsed.data;
    else errors.form = parsed.error.issues[0].message;
  }

  return {
    name: name.success ? name.data : null,
    nextConfig,
    errors,
    canSave: nextConfig !== null,
  };
}
