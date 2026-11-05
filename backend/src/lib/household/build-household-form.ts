import { isDeepStrictEqual } from "node:util";
import {
  formatCents,
  formatDayOrdinal,
  formatMonthLabel,
  PERSON_COLORS,
  TENANT_PERSON_COLORS,
  type HouseholdAddFormResponse,
  type HouseholdConfig,
  type HouseholdFormResponse,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { amountText } from "./amount-text";
import { nextPersonColor, personColorName } from "./person-color";
import { emptyTenantRooms, isRentInTotal, roomOf, tenantRentCents } from "./room-amounts";
import { hasPayersVia, routeText, sentViaChoices, viaOf } from "./route-via";

const NONE = "—";

/** What `buildHouseholdForm` reads. */
export interface HouseholdFormInput {
  /** The month after the active one, `YYYY-MM`: the latest saved values and any new edit start then. */
  month: string;
  /** The config in effect for `month`, with the person in it. */
  config: HouseholdConfig;
  /** The active month's config, to tell whether the saved values have taken effect yet. */
  activeConfig: HouseholdConfig | null;
  personId: string;
  /** Everyone's `Person` rows. */
  people: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[];
}

/** Money without its `$`, since the label says SGD. */
const plainMoney = (cents: number) => formatCents(cents).replace("$", "");
const dayText = (day: number | undefined) => (day ? formatDayOrdinal(day) : NONE);

/**
 * The Add subtenant screen, display-ready. The default color is the first one nobody in the config uses.
 *
 * @param input - The month the tenant joins from, its config and everyone's rows.
 * @returns The response for `GET /api/household/add-form`.
 */
export function buildAddPersonForm(input: Pick<HouseholdFormInput, "month" | "config" | "people">): HouseholdAddFormResponse {
  const { config, month, people } = input;
  const inConfig = new Set(config.people.map((p) => p.personId));
  const color = nextPersonColor(people.filter((p) => inConfig.has(p.id)).map((p) => p.color));

  return {
    title: "Add subtenant",
    sub: "New person in the household",
    datedTitle: `From ${formatMonthLabel(month)}`,
    color,
    colorName: personColorName(color),
    swatches: TENANT_PERSON_COLORS.map((c) => ({ color: c, name: personColorName(c) })),
    sentViaOptions: sentViaChoices(config.people, new Map(people.map((p) => [p.id, p.name])), null),
    rooms: emptyTenantRooms(config).map((room) => ({
      id: room.id,
      name: room.name,
      facts: [
        { label: "Rent (SGD)", value: formatCents(room.rentCents) },
        { label: "Aircon units", value: String(room.airconUnits) },
      ],
    })),
  };
}

/** What happens to a removed tenant's room. A room not in the total hands over only its aircon, since its rent never reached the landlord. */
function removeRoomLine(config: HouseholdConfig, personId: string, names: Map<string, string>): string {
  const primary = config.people.find((p) => p.role === "PRIMARY");
  const sharers = primary ? `You and ${names.get(primary.personId) ?? "Someone"}` : "you";
  const room = roomOf(config, personId);
  return isRentInTotal(config, personId)
    ? `${room.name} becomes empty. Its ${formatCents(tenantRentCents(config, personId))} rent and its aircon move to ${sharers}.`
    : `${room.name} becomes empty and its aircon moves to ${sharers}. Their rent was never part of the landlord rent, so your rent doesn’t change. You simply stop receiving it.`;
}

/** The remove dialog's text for a tenant. The third line only shows when something goes with them. */
function removeDialog(config: HouseholdConfig, person: PersonConfig, names: Map<string, string>, monthLabel: string) {
  const { personId } = person;
  const goes = config.recurring.some((r) => r.personId === personId) ? ["recurring charges"] : [];
  return {
    title: `Remove ${names.get(personId)} from household?`,
    body: `From ${monthLabel} they won’t get any charges or messages, and their utility shares leave the total.`,
    roomLine: removeRoomLine(config, personId, names),
    keeps: [
      "Past months and History stay as they are",
      ...(person.depositCents ? [`Their ${formatCents(person.depositCents)} deposit stays recorded until you return it`] : []),
      ...(goes.length > 0 ? [`Their ${goes.join(" and ")} go with them`] : []),
    ],
  };
}

/**
 * One person's Edit and View screens with their latest saved values, display-ready.
 *
 * @param input - The month, its config, the active month's config, the person and everyone's rows.
 * @returns The response for `GET /api/household/form`.
 * @throws {Error} When the person is not in the config or has no row; the service checks both first.
 */
export function buildHouseholdForm(input: HouseholdFormInput): HouseholdFormResponse {
  const { activeConfig, config, month, personId } = input;
  const person = config.people.find((p) => p.personId === personId);
  const row = input.people.find((p) => p.id === personId);
  if (!person || !row) throw new Error("The person is not in the version");

  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const isTenant = person.role === "TENANT";
  const rentVia = viaOf(person, "RENT");
  const utilitiesVia = viaOf(person, "UTILITIES");
  const dueRows = {
    rent: { label: "Rent due", value: dayText(person.dueDays.RENT) },
    utilities: { label: "Utilities due", value: dayText(person.dueDays.UTILITIES) },
  };
  const colors = row.isOwner ? PERSON_COLORS : TENANT_PERSON_COLORS;
  const monthLabel = formatMonthLabel(month);
  const activePerson = activeConfig?.people.find((p) => p.personId === personId);
  // A rent or units change sits on the room, not the person's entry.
  const activeRoom = activeConfig && activePerson ? roomOf(activeConfig, personId) : null;
  const room = roomOf(config, personId);
  const roomRows = {
    name: { label: "Room", value: room.name },
    rent: { label: "Rent (SGD)", value: formatCents(tenantRentCents(config, personId)) },
    units: { label: "Aircon units", value: String(room.airconUnits) },
  };

  return {
    personId,
    title: `Edit ${row.name}`,
    viewTitle: row.name,
    datedTitle: `From ${monthLabel}`,
    pendingNote:
      isDeepStrictEqual(activePerson, person) && isDeepStrictEqual(activeRoom, room)
        ? null
        : `These take effect from ${monthLabel}.`,
    values: {
      name: row.name,
      whatsappE164: row.whatsappE164,
      color: row.color,
      rentDueDay: person.dueDays.RENT ?? null,
      utilitiesDueDay: person.dueDays.UTILITIES ?? null,
      rentViaPersonId: rentVia,
      utilitiesViaPersonId: utilitiesVia,
      depositCents: isTenant ? person.depositCents : null,
    },
    room: isTenant ? [roomRows.name, roomRows.rent, roomRows.units] : [],
    colorName: personColorName(row.color),
    swatches: colors.map((color) => ({ color, name: personColorName(color) })),
    sentViaOptions: isTenant && !hasPayersVia(config.people, personId) ? sentViaChoices(config.people, names, personId) : [],
    view: {
      details: [
        { label: "Name (used in messages)", value: row.name },
        { label: "WhatsApp", value: row.whatsappE164 ?? NONE },
      ],
      room: isTenant
        ? [roomRows.name, roomRows.rent, { label: "Utility shares", value: amountText(person.utilityShares) }, roomRows.units]
        : [],
      amounts: isTenant
        ? [
            dueRows.rent,
            dueRows.utilities,
            { label: "Deposit held (SGD)", value: person.depositCents ? plainMoney(person.depositCents) : "None" },
          ]
        : [dueRows.rent, dueRows.utilities],
      routes: isTenant
        ? [
            { label: "Rent paid", value: routeText(rentVia, names) },
            { label: "Utilities paid", value: routeText(utilitiesVia, names) },
          ]
        : [],
    },
    secondaryAction: isTenant
      ? { label: "Remove from household", kind: "remove-person" }
      : { label: "Cancel", kind: "cancel" },
    removeDialog: isTenant ? removeDialog(config, person, names, monthLabel) : null,
  };
}
