import { requiredText, type HouseholdAddPersonEdit, type HouseholdConfig, type PersonConfig } from "@splithouse/shared";
import { datedFieldErrors, planPersonChanges } from "./plan-edit";
import { sharedAirconUnits } from "./room-amounts";

/** What adding a person would do. The preview returns it and the save stores it. */
export interface AddPersonPlan {
  /** The trimmed name, or null while it is empty. */
  name: string | null;
  /** The new config. Always null until 9.17, since a new tenant has no room to go in yet. */
  nextConfig: HouseholdConfig | null;
  errors: Record<string, string>;
  canSave: boolean;
}

const ADD_REFUSED_ERROR = "Adding a subtenant is not available yet.";

/** The checks on the shares and units, which `datedFieldErrors` does not know, since an edit no longer sends them. */
function countErrors(edit: HouseholdAddPersonEdit, config: HouseholdConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (edit.utilityShares !== null && edit.utilityShares < 0) errors.utilityShares = "Enter 0 or more.";
  if (edit.airconUnits !== null) {
    if (edit.airconUnits < 0) errors.airconUnits = "Enter 0 or more.";
    else if (edit.airconUnits > sharedAirconUnits(config)) errors.airconUnits = "Invalid entry.";
  }
  return errors;
}

/**
 * Checks a new tenant's fields, then refuses them: a tenant needs a room, and picking one arrives at 9.17,
 * which rebuilds this plan. Pure, for the preview and the save alike.
 *
 * @param edit - The new tenant.
 * @param personId - The id the new `Person` row would take.
 * @param config - The config in effect next month.
 * @returns The name, no new config, the errors per field with the refusal under `form`, and no Save.
 */
export function planAddPerson(edit: HouseholdAddPersonEdit, personId: string, config: HouseholdConfig): AddPersonPlan {
  const blank: PersonConfig = {
    personId,
    role: "TENANT",
    roomId: "",
    utilityShares: 0,
    routes: {},
    dueDays: {},
    depositCents: 0,
  };
  const name = requiredText.safeParse(edit.name);
  // The same shape as an edit to a tenant with nothing yet, so the same rules apply.
  const asPersonEdit = {
    ...edit,
    kind: "person" as const,
    personId,
    name: name.success ? name.data : undefined,
    rentCents: edit.rentCents ?? undefined,
  };

  return {
    name: name.success ? name.data : null,
    nextConfig: null,
    errors: {
      ...planPersonChanges(asPersonEdit, { id: personId, name: "", whatsappE164: null, color: "BLUE", isOwner: false }).errors,
      ...datedFieldErrors(asPersonEdit, blank, config.people),
      ...countErrors(edit, config),
      form: ADD_REFUSED_ERROR,
    },
    canSave: false,
  };
}
