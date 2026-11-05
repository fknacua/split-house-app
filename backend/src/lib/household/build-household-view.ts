import {
  formatCents,
  formatDayOrdinal,
  formatMonthShortLabel,
  type ChargeType,
  type HouseholdConfig,
  type HouseholdFact,
  type HouseholdMonthOption,
  type HouseholdPerson,
  type HouseholdSplitRow,
  type HouseholdViewResponse,
  type PersonColor,
  type PersonConfig,
} from "@splithouse/shared";
import { HOME_BADGES } from "@/lib/home/badges";
import { amountText, countText, SHARE_SCALE } from "./amount-text";
import { isRentInTotal, roomCount, roomOf, tenantRentCents, totalAirconUnits } from "./room-amounts";
import { remaindersOf, type Remainders } from "./split-remainders";

/** What `buildHouseholdView` reads. */
export interface HouseholdViewInput {
  /** The month to show, `YYYY-MM`. */
  month: string;
  /** The active month: the newest opened, or the calendar month when later. */
  activeMonth: string;
  /** Every household version's starts-from month. */
  versionMonths: string[];
  /** The config in effect for `month`. */
  config: HouseholdConfig;
  /** Who is in the household next month. Edit and View show the latest saved values, so only they have the buttons. */
  editablePersonIds: ReadonlySet<string>;
  /** Everyone, for names and colors. */
  people: { id: string; name: string; color: PersonColor }[];
}

const FALLBACK_COLOR: PersonColor = "SLATE";

/** The names and colors from the `Person` rows. */
interface PersonLookup {
  names: Map<string, string>;
  colors: Map<string, PersonColor>;
}

/** The "Showing:" list: each version's starts-from month and the active month, newest first. */
function monthOptions(input: HouseholdViewInput): HouseholdMonthOption[] {
  const months = [...new Set([...input.versionMonths, input.activeMonth])].sort().reverse();
  return months.map((month) => ({
    month,
    label: formatMonthShortLabel(month),
    badge: month > input.activeMonth ? HOME_BADGES.upcoming : null,
  }));
}

/** The person this charge type goes via, or null when it is paid directly. */
function viaId(person: PersonConfig, type: ChargeType): string | null {
  const route = person.routes[type];
  return route?.kind === "VIA" ? route.viaPersonId : null;
}

/** A fact label with the due day when one is set. Via someone, the day is that person's. */
function dueLabel(config: HouseholdConfig, person: PersonConfig, type: ChargeType, label: string): string {
  const via = viaId(person, type);
  const payer = via ? config.people.find((p) => p.personId === via) : person;
  const day = payer?.dueDays[type];
  return day ? `${label} · due ${formatDayOrdinal(day)}` : label;
}

/** The facts on a primary tenant's or tenant's card: rent and utilities. */
function personFacts(config: HouseholdConfig, person: PersonConfig, remainders: Remainders): HouseholdFact[] {
  const isPrimary = person.role === "PRIMARY";
  const rentCents = isPrimary ? remainders.rent.primary : tenantRentCents(config, person.personId);
  const shares = isPrimary ? remainders.shares.primary : person.utilityShares;

  return [
    { label: dueLabel(config, person, "RENT", "Rent"), value: formatCents(rentCents) },
    { label: dueLabel(config, person, "UTILITIES", "Utilities"), value: countText(shares, "share") },
  ];
}

/** Everyone's cards as drawn: the primary tenant, the tenants in config order, then the owner as `You`. */
function personCards(input: HouseholdViewInput, remainders: Remainders, { names, colors }: PersonLookup): HouseholdPerson[] {
  const { config } = input;
  const { owner, primary } = remainders;
  const tenants = config.people.filter((p) => p.role === "TENANT");

  const card = (person: PersonConfig): HouseholdPerson => {
    const name = names.get(person.personId) ?? "Someone";
    return {
      personId: person.personId,
      initial: (Array.from(name.trim())[0] ?? "?").toUpperCase(),
      name,
      color: colors.get(person.personId) ?? FALLBACK_COLOR,
      facts: personFacts(config, person, remainders),
      actions: input.editablePersonIds.has(person.personId)
        ? [
            { label: "View", target: { kind: "view-person", personId: person.personId } },
            { label: "Edit", target: { kind: "edit-person", personId: person.personId } },
          ]
        : [],
    };
  };

  return [
    ...(primary ? [card(primary)] : []),
    ...tenants.map(card),
    {
      personId: owner.personId,
      initial: "Y",
      name: "You",
      color: colors.get(owner.personId) ?? FALLBACK_COLOR,
      facts: [
        { label: "Rent share", value: formatCents(remainders.rent.owner) },
        { label: "Utilities", value: countText(remainders.shares.owner, "share") },
      ],
      actions: [],
    },
  ];
}

/** "Household split": rent, utilities and aircon across everyone, the owner first, then the primary tenant, then the tenants. */
function splitRows(config: HouseholdConfig, remainders: Remainders, { names, colors }: PersonLookup): HouseholdSplitRow[] {
  const { owner, primary, rent, shares, units } = remainders;
  const tenants = config.people.filter((p) => p.role === "TENANT");

  const row = (
    label: string,
    split: { owner: number; primary: number },
    tenantAmount: (tenant: PersonConfig) => number,
    format: (amount: number) => string,
    detail: (total: number) => string,
    tenantInTotal: (tenant: PersonConfig) => boolean = () => true,
  ): HouseholdSplitRow => {
    const parts = [
      { person: owner, name: "You", amount: split.owner, inTotal: true },
      ...(primary
        ? [{ person: primary, name: names.get(primary.personId) ?? "Someone", amount: split.primary, inTotal: true }]
        : []),
      ...tenants.map((tenant) => ({
        person: tenant,
        name: names.get(tenant.personId) ?? "Someone",
        amount: tenantAmount(tenant),
        inTotal: tenantInTotal(tenant),
      })),
    ];
    const total = parts.reduce((sum, part) => (part.inTotal ? sum + part.amount : sum), 0);
    const segments = parts.map(({ person, name, amount, inTotal }) => ({
      personId: person.personId,
      name,
      value: format(amount),
      percent: inTotal && total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      color: colors.get(person.personId) ?? FALLBACK_COLOR,
      inTotal,
    }));
    const outOfTotal = segments.filter((s) => !s.inTotal).map((s) => s.name);
    return {
      label,
      detail: detail(total),
      segments,
      note: outOfTotal.length > 0 ? `Not in total: ${outOfTotal.join(", ")}` : null,
      accessibilityLabel: `${label}: ${segments.map((s) => `${s.name} ${s.value}${s.inTotal ? "" : " (not in total)"}`).join(", ")}`,
    };
  };

  return [
    row(
      "Rent",
      rent,
      (t) => tenantRentCents(config, t.personId),
      formatCents,
      formatCents,
      (t) => isRentInTotal(config, t.personId),
    ),
    row("Utilities", shares, (t) => t.utilityShares, amountText, (total) => countText(total, "share")),
    row("Aircon", units, (t) => roomOf(config, t.personId).airconUnits * SHARE_SCALE, amountText, (total) => countText(total, "unit")),
  ];
}

/**
 * The Household screen for one month, display-ready. Reads the config only: no bill exists for a
 * future month, so utilities and aircon show as shares and units, never as money.
 *
 * @param input - The month, the config in effect for it, the people and the version months.
 * @returns The response for `GET /api/household`.
 */
export function buildHouseholdView(input: HouseholdViewInput): HouseholdViewResponse {
  const { config } = input;
  const lookup: PersonLookup = {
    names: new Map(input.people.map((p) => [p.id, p.name])),
    colors: new Map(input.people.map((p) => [p.id, p.color])),
  };
  const remainders = remaindersOf(config);
  const { rent, utilities } = config.categories;
  const rooms = roomCount(config);
  const airconTotal = totalAirconUnits(config);

  return {
    month: input.month,
    monthLabel: formatMonthShortLabel(input.month),
    monthOptions: monthOptions(input),
    landlord: {
      label: `Landlord rent · due ${formatDayOrdinal(rent.landlordDueDay)} of the month`,
      amount: formatCents(rent.landlordRentCents),
      stats: [
        { value: String(rooms), label: rooms === 1 ? "room" : "rooms" },
        { value: String(airconTotal), label: airconTotal === 1 ? "aircon unit" : "aircon units" },
        {
          value: amountText(utilities.totalShares),
          label: utilities.totalShares === SHARE_SCALE ? "utility share" : "utility shares",
        },
      ],
      edit: { label: "Edit", target: { kind: "edit-home" } },
    },
    splitRows: splitRows(config, remainders, lookup),
    editSplits: { label: "Edit splits", target: { kind: "edit-splits" } },
    people: personCards(input, remainders, lookup),
    addPerson: { label: "Add subtenant", target: { kind: "add-person" } },
  };
}
