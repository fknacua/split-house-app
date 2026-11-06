import { householdConfigSchema, requiredText, type HouseholdAddPersonEdit, type HouseholdConfig, type PersonConfig } from "@splithouse/shared";
import { applyAddPerson, applyPersonEdit } from "./apply-edit";
import { FIRST_PRIMARY_BPS, withPrimarySplit } from "./first-setup";
import { datedFieldErrors, planPersonChanges, SPLIT_ERROR } from "./plan-edit";
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

/** Options for `planAddPerson`. */
export interface AddPersonOptions {
  /** True in First run, where the master room can be picked while there is no primary tenant. */
  firstSetup?: boolean;
}

/** Whether the edit adds the primary tenant: First run only, into the master room, while there is none. */
function addsPrimary(edit: HouseholdAddPersonEdit, config: HouseholdConfig, firstSetup: boolean): boolean {
  const master = config.rooms.find((room) => room.roomType === "MASTER");
  return (
    firstSetup &&
    master !== undefined &&
    edit.roomId === master.id &&
    !config.people.some((p) => p.role === "PRIMARY")
  );
}

/** The checks on the room and shares, which `datedFieldErrors` does not know, since a person edit does not send them. */
function roomAndShareErrors(edit: HouseholdAddPersonEdit, config: HouseholdConfig, isPrimary: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isPrimary && edit.roomId !== null && !emptyTenantRooms(config).some((room) => room.id === edit.roomId)) {
    errors.roomId = "Choose an empty room.";
  }
  // The primary tenant's part comes from the split, so they send no shares.
  if (isPrimary && edit.utilityShares) errors.utilityShares = SPLIT_ERROR;
  else if (edit.utilityShares !== null && edit.utilityShares < 0) errors.utilityShares = "Enter 0 or more.";
  return errors;
}

/**
 * Works out what adding a person would do, for the preview and the save alike. Pure: the service reads the
 * version and stores the result. An empty required field is no error, it only keeps Save disabled, so the
 * form stays calm until something typed is wrong.
 *
 * A tenant takes an empty tenant room. In First run, picking the master room while there is no primary tenant
 * adds them as the primary tenant, with no shares or deposit, and sets the rent, utilities and aircon splits to 50/50.
 *
 * @param edit - The new person.
 * @param personId - The id the new `Person` row will take.
 * @param config - The config the person joins.
 * @param options - Whether First run is on.
 * @returns The name, the new config, the errors per field and whether Save is allowed.
 */
export function planAddPerson(
  edit: HouseholdAddPersonEdit,
  personId: string,
  config: HouseholdConfig,
  options: AddPersonOptions = {},
): AddPersonPlan {
  const { roomId, utilityShares, ...rest } = edit;
  const isPrimary = addsPrimary(edit, config, options.firstSetup ?? false);
  const blank: PersonConfig = {
    personId,
    role: isPrimary ? "PRIMARY" : "TENANT",
    roomId: "",
    utilityShares: 0,
    routes: {},
    dueDays: {},
    depositCents: 0,
  };
  const name = requiredText.safeParse(edit.name);
  // The same shape as an edit to a person with nothing yet, so the same rules apply.
  const asPersonEdit = {
    ...rest,
    kind: "person" as const,
    personId,
    name: name.success ? name.data : undefined,
  };

  const errors: Record<string, string> = {
    ...planPersonChanges(asPersonEdit, { id: personId, name: "", whatsappE164: null, color: "BLUE", isOwner: false }).errors,
    ...datedFieldErrors(asPersonEdit, blank, config.people),
    ...roomAndShareErrors(edit, config, isPrimary),
  };

  const complete =
    name.success &&
    roomId !== null &&
    (isPrimary || utilityShares !== null) &&
    (edit.rentViaPersonId !== null || edit.rentDueDay !== null) &&
    (edit.utilitiesViaPersonId !== null || edit.utilitiesDueDay !== null);

  let nextConfig: HouseholdConfig | null = null;
  if (complete && Object.keys(errors).length === 0) {
    const person = { ...applyPersonEdit(blank, asPersonEdit), roomId, utilityShares: isPrimary ? 0 : (utilityShares ?? 0) };
    const added = applyAddPerson(config, person);
    const parsed = householdConfigSchema.safeParse(isPrimary ? withPrimarySplit(added, FIRST_PRIMARY_BPS) : added);
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
