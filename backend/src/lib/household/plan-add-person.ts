import { householdConfigSchema, requiredText, type HouseholdAddPersonEdit, type HouseholdConfig, type PersonConfig } from "@splithouse/shared";
import { applyAddPerson, applyPersonEdit } from "./apply-edit";
import { datedFieldErrors, planPersonChanges } from "./plan-edit";
import { emptyTenantRooms } from "./room-amounts";

/** What adding a person would do. The preview returns it and the save stores it. */
export interface AddPersonPlan {
  /** The trimmed name, or null while it is empty. */
  name: string | null;
  /** The new config, or null while a required field is empty or anything is invalid. */
  nextConfig: HouseholdConfig | null;
  errors: Record<string, string>;
  canSave: boolean;
}

/** The checks on the room and shares, which `datedFieldErrors` does not know, since a person edit does not send them. */
function roomAndShareErrors(edit: HouseholdAddPersonEdit, config: HouseholdConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (edit.roomId !== null && !emptyTenantRooms(config).some((room) => room.id === edit.roomId)) {
    errors.roomId = "Choose an empty room.";
  }
  if (edit.utilityShares !== null && edit.utilityShares < 0) errors.utilityShares = "Enter 0 or more.";
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
  const { roomId, utilityShares, ...rest } = edit;
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
    ...rest,
    kind: "person" as const,
    personId,
    name: name.success ? name.data : undefined,
  };

  const errors: Record<string, string> = {
    ...planPersonChanges(asPersonEdit, { id: personId, name: "", whatsappE164: null, color: "BLUE", isOwner: false }).errors,
    ...datedFieldErrors(asPersonEdit, blank, config.people),
    ...roomAndShareErrors(edit, config),
  };

  const complete =
    name.success &&
    roomId !== null &&
    utilityShares !== null &&
    (edit.rentViaPersonId !== null || edit.rentDueDay !== null) &&
    (edit.utilitiesViaPersonId !== null || edit.utilitiesDueDay !== null);

  let nextConfig: HouseholdConfig | null = null;
  if (complete && Object.keys(errors).length === 0) {
    const tenant = { ...applyPersonEdit(blank, asPersonEdit), roomId, utilityShares };
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
