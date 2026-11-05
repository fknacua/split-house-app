import { isDeepStrictEqual } from "node:util";
import {
  formatCents,
  formatMonthLabel,
  type HouseholdConfig,
  type HouseholdSplitFormResponse,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { isRentInTotal, masterRentCents, roomOf, sharedAirconUnits, tenantRentCents, totalAirconUnits } from "./room-amounts";
import { splitAmounts } from "./split-amounts";

/** What `buildSplitForm` reads. */
export interface SplitFormInput {
  /** The month after the active one, `YYYY-MM`: the latest saved values and any new edit start then. */
  month: string;
  /** The config in effect for `month`. */
  config: HouseholdConfig;
  /** The active month's config, to tell whether the saved values have taken effect yet. */
  activeConfig: HouseholdConfig | null;
  /** Everyone's `Person` rows, for the names and colors. */
  people: { id: string; name: string; color: PersonColor }[];
}

const FALLBACK_COLOR: PersonColor = "SLATE";

const tenantsOf = (config: HouseholdConfig) => config.people.filter((p) => p.role === "TENANT");

/** The values this screen edits or shows, to compare with the active month's. */
function comparableValues(config: HouseholdConfig) {
  const { rent, utilities, aircon } = config.categories;
  return {
    rentPrimaryBps: rent.primaryBps,
    utilitiesPrimaryBps: utilities.primaryBps,
    airconPrimaryBps: aircon.primaryBps,
    totalShares: utilities.totalShares,
    masterRent: masterRentCents(config),
    sharedUnits: sharedAirconUnits(config),
    totalUnits: totalAirconUnits(config),
    tenants: tenantsOf(config).map((p) => ({
      personId: p.personId,
      utilityShares: p.utilityShares,
      room: roomOf(config, p.personId),
    })),
  };
}

/**
 * The Household split screen with the latest saved values, display-ready.
 *
 * @param input - The month, its config, the active month's config and everyone's rows.
 * @returns The response for `GET /api/household/split-form`.
 * @throws {Error} When the config has no owner.
 */
export function buildSplitForm(input: SplitFormInput): HouseholdSplitFormResponse {
  const { activeConfig, config, month } = input;
  const nameOf = (personId: string) => input.people.find((p) => p.id === personId)?.name ?? "Someone";
  const colorOf = (personId: string) => input.people.find((p) => p.id === personId)?.color ?? FALLBACK_COLOR;
  const owner = config.people.find((p) => p.role === "OWNER");
  if (!owner) throw new Error("Config has no owner");
  const primary = config.people.find((p) => p.role === "PRIMARY") ?? null;
  const { rent, utilities, aircon } = config.categories;
  const monthLabel = formatMonthLabel(month);
  const isPending = !activeConfig || !isDeepStrictEqual(comparableValues(activeConfig), comparableValues(config));
  const tenants = tenantsOf(config);
  const roomLabel = (p: PersonConfig) => `${nameOf(p.personId)} · ${roomOf(config, p.personId).name}`;

  return {
    title: "Household split",
    datedTitle: `From ${monthLabel}`,
    pendingNote: isPending ? `These take effect from ${monthLabel}.` : null,
    splitTitle: primary ? `Split between you and ${nameOf(primary.personId)}` : null,
    owner: { name: "You", color: colorOf(owner.personId) },
    primary: primary ? { name: nameOf(primary.personId), color: colorOf(primary.personId) } : null,
    values: {
      tenantShares: tenants.map((p) => ({
        personId: p.personId,
        name: nameOf(p.personId),
        color: colorOf(p.personId),
        utilityShares: p.utilityShares,
      })),
      totalShares: utilities.totalShares,
      rentPrimaryBps: rent.primaryBps,
      utilitiesPrimaryBps: utilities.primaryBps,
      airconPrimaryBps: aircon.primaryBps,
    },
    rent: {
      title: "Rent (SGD)",
      rows: tenants.map((p) => ({
        personId: p.personId,
        name: roomLabel(p),
        color: colorOf(p.personId),
        value: formatCents(tenantRentCents(config, p.personId)),
        inTotal: isRentInTotal(config, p.personId),
      })),
      leftLabel: "Shared rent",
    },
    utilities: { title: "Utilities (shares)", totalLabel: "Total shares", leftLabel: "Left to split" },
    aircon: {
      title: "Aircon (units)",
      rows: tenants.map((p) => ({
        personId: p.personId,
        name: roomLabel(p),
        color: colorOf(p.personId),
        value: String(roomOf(config, p.personId).airconUnits),
        inTotal: true,
      })),
      leftLabel: "Left to split",
      totalLabel: "Total units",
      total: String(totalAirconUnits(config)),
    },
    amounts: splitAmounts(config),
  };
}
