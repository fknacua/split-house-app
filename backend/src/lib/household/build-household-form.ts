import {
  addMonths,
  formatCents,
  formatDayOrdinal,
  monthRange,
  PERSON_COLORS,
  TENANT_PERSON_COLORS,
  type ChargeType,
  type HouseholdConfig,
  type HouseholdFormResponse,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { amountText } from "./amount-text";
import { personColorName } from "./person-color";
import { personSubLine } from "./sub-line";

/** How many months ahead Starts from offers. */
const STARTS_FROM_MONTHS = 12;
const NONE = "—";

/** What `buildHouseholdForm` reads. */
export interface HouseholdFormInput {
  /** The month the values are read from, `YYYY-MM`. */
  month: string;
  /** The Starts from options. */
  startsFromOptions: string[];
  /** The config in effect for `month`, with the person in it. */
  config: HouseholdConfig;
  personId: string;
  /** Everyone's `Person` rows. */
  people: { id: string; name: string; whatsappE164: string | null; color: PersonColor; isOwner: boolean }[];
}

/**
 * The months a dated edit can start from: the next 12 after the active month, plus any upcoming
 * version further out, so it can still be edited.
 *
 * @param activeMonth - The active month.
 * @param versionMonths - Every version's starts-from month.
 * @returns Month keys, oldest first.
 */
export function startsFromMonths(activeMonth: string, versionMonths: string[]): string[] {
  const next = monthRange(addMonths(activeMonth, 1), STARTS_FROM_MONTHS);
  const upcoming = versionMonths.filter((month) => month > activeMonth);
  return [...new Set([...next, ...upcoming])].sort();
}

/** Money without its `$`, since the label says SGD. */
const plainMoney = (cents: number) => formatCents(cents).replace("$", "");
const dayText = (day: number | undefined) => (day ? formatDayOrdinal(day) : NONE);

/** The person a charge type goes via, or null when it is paid directly. */
function viaOf(person: PersonConfig, type: ChargeType): string | null {
  const route = person.routes[type];
  return route?.kind === "VIA" ? route.viaPersonId : null;
}

/**
 * One person's Edit and View screens for one month, display-ready.
 *
 * @param input - The month, its config, the person and everyone's rows.
 * @returns The response for `GET /api/household/form`.
 * @throws {Error} When the person is not in the config or has no row; the service checks both first.
 */
export function buildHouseholdForm(input: HouseholdFormInput): HouseholdFormResponse {
  const { config, month, personId, startsFromOptions } = input;
  const person = config.people.find((p) => p.personId === personId);
  const row = input.people.find((p) => p.id === personId);
  if (!person || !row) throw new Error("The person is not in the version");

  const names = new Map(input.people.map((p) => [p.id, p.name]));
  const isTenant = person.role === "TENANT";
  const rentVia = viaOf(person, "RENT");
  const utilitiesVia = viaOf(person, "UTILITIES");
  const routeText = (via: string | null) => (via ? `Via ${names.get(via) ?? "someone"}` : "Directly");
  const dueRows = {
    rent: { label: "Rent due", value: dayText(person.dueDays.RENT) },
    utilities: { label: "Utilities due", value: dayText(person.dueDays.UTILITIES) },
  };
  const colors = row.isOwner ? PERSON_COLORS : TENANT_PERSON_COLORS;

  return {
    personId,
    title: `Edit ${row.name}`,
    viewTitle: row.name,
    sub: personSubLine(config, personId, names),
    month,
    startsFrom: startsFromOptions.includes(month) ? month : startsFromOptions[0],
    startsFromOptions,
    values: {
      name: row.name,
      whatsappE164: row.whatsappE164,
      color: row.color,
      rentDueDay: person.dueDays.RENT ?? null,
      utilitiesDueDay: person.dueDays.UTILITIES ?? null,
      rentViaPersonId: rentVia,
      utilitiesViaPersonId: utilitiesVia,
      amounts: isTenant
        ? {
            rentCents: person.rentCents,
            utilityShares: person.utilityShares,
            airconUnits: person.airconUnits,
            depositCents: person.depositCents,
          }
        : null,
    },
    colorName: personColorName(row.color),
    swatches: colors.map((color) => ({ color, name: personColorName(color) })),
    sentViaOptions: config.people
      .filter((p) => p.personId !== personId && p.role !== "OWNER")
      .map((p) => ({ personId: p.personId, name: names.get(p.personId) ?? "Someone" })),
    view: {
      details: [
        { label: "Name (used in messages)", value: row.name },
        { label: "WhatsApp", value: row.whatsappE164 ?? NONE },
      ],
      amounts: isTenant
        ? [
            { label: "Rent (SGD)", value: plainMoney(person.rentCents) },
            dueRows.rent,
            { label: "Utility shares", value: amountText(person.utilityShares) },
            dueRows.utilities,
            { label: "Aircon units", value: String(person.airconUnits) },
            { label: "Deposit held (SGD)", value: person.depositCents ? plainMoney(person.depositCents) : "None" },
          ]
        : [dueRows.rent, dueRows.utilities],
      routes: [
        { label: "Rent paid", value: routeText(rentVia) },
        { label: "Utilities paid", value: routeText(utilitiesVia) },
      ],
    },
    secondaryAction: isTenant
      ? { label: "Remove from household", kind: "remove-person" }
      : { label: "Cancel", kind: "cancel" },
  };
}
