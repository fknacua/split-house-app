import { z } from "zod";
import { cents, monthKey } from "./primitives";

/**
 * Version of the shape of `HouseholdVersion.config` (see docs/SplitHouse — Data Model.md).
 * Money is integer cents, shares are thousandths (1.5 shares = 1500), splits are
 * basis points (5000 = 50%). Bump it when the shape changes.
 */
export const HOUSEHOLD_SCHEMA_VERSION = 2;

/** The charge types a person can have a route and due day for. */
export const CHARGE_TYPES = ["RENT", "UTILITIES", "AIRCON", "RECURRING"] as const;

/** One of {@link CHARGE_TYPES}. */
export type ChargeType = (typeof CHARGE_TYPES)[number];

/** Placeholders a message template may use. */
export const TEMPLATE_PLACEHOLDERS = [
  "name",
  "month",
  "lines",
  "total",
  "dueDate",
  "charge",
  "amount",
] as const;

const nonNegativeInt = z.number().int().min(0);
const dueDay = z.number().int().min(1).max(31);
const basisPoints = z.number().int().min(0).max(10000);

const chargeTypeRecord = <T extends z.ZodType>(value: T) =>
  z.partialRecord(z.enum(CHARGE_TYPES), value);

// Owner is Francis; the primary tenant shares the master room with the owner.
const role = z.enum(["OWNER", "PRIMARY", "TENANT"]);

const route = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("DIRECT") }),
  z.object({ kind: z.literal("VIA"), viaPersonId: z.string().min(1) }),
]);

const roomFields = {
  id: z.string().min(1),
  name: z.string().trim().min(1),
  airconUnits: nonNegativeInt,
};

// A room's people are worked out from each person's roomId. Nothing stores "empty".
const room = z.discriminatedUnion("roomType", [
  // The owner and primary tenant's room. Its rent is calculated, never stored.
  z.object({ ...roomFields, roomType: z.literal("MASTER") }),
  // An empty room keeps its rent and includeInTotal for the next tenant.
  z.object({
    ...roomFields,
    roomType: z.literal("TENANT"),
    rentCents: nonNegativeInt,
    // Off: the rent is still charged to the tenant, but it is not part of what goes to the landlord.
    includeInTotal: z.boolean(),
  }),
  z.object({ ...roomFields, roomType: z.literal("COMMON") }),
]);

const personConfig = z.object({
  personId: z.string().min(1),
  role,
  roomId: z.string().min(1),
  // Tenants only. Owner and primary tenant take the remainder of the total.
  utilityShares: nonNegativeInt.default(0),
  // Missing entry means DIRECT / no due day set.
  routes: chargeTypeRecord(route).default({}),
  dueDays: chargeTypeRecord(dueDay).default({}),
  depositCents: nonNegativeInt.default(0),
});

// The total is split between tenants (their explicit shares) and the remainder,
// which goes to owner and primary tenant by basis points.
const remainderCategory = z.object({
  ownerBps: basisPoints,
  primaryBps: basisPoints,
});

const rentCategory = remainderCategory.extend({
  landlordRentCents: nonNegativeInt,
  // Shown on the Household rent card. Nothing is charged or reminded from it.
  landlordDueDay: dueDay,
});

const utilitiesCategory = remainderCategory.extend({
  totalShares: z.number().int().positive(),
  // Day of the month the utilities bill is due. Home uses it before a bill exists;
  // an uploaded bill's own due date supersedes it.
  billDueDay: dueDay.optional(),
});

const recurringCharge = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
  amountCents: cents,
  personId: z.string().min(1),
  endMonth: monthKey.optional(),
});

const templates = z.object({
  monthly: z.string().min(1),
  nudge: z.string().min(1),
  overrides: z
    .array(
      z.object({
        personId: z.string().min(1),
        kind: z.enum(["MONTHLY", "NUDGE"]),
        text: z.string().min(1),
      }),
    )
    .default([]),
  // Custom line labels, e.g. { UTILITIES: "Kuryente at tubig" }.
  lineLabels: chargeTypeRecord(z.string().trim().min(1)).default({}),
  // Custom breakdown section titles by the person whose lines the section holds, without the
  // colon, e.g. { "person-priya": "Master Bedroom Share" }. Missing means "Yours" or
  // "{name}’s (please collect)".
  sectionTitles: z.record(z.string().min(1), z.string().trim().min(1)).default({}),
});

/**
 * The household settings of one version: rooms, people, the rent, utilities
 * and aircon categories, recurring charges and message templates. Rejects
 * configs whose rooms, shares, percentages or references do not add up.
 */
export const householdConfigSchema = z
  .object({
    rooms: z.array(room),
    people: z.array(personConfig).min(1),
    categories: z.object({
      rent: rentCategory,
      utilities: utilitiesCategory,
      aircon: remainderCategory,
    }),
    recurring: z.array(recurringCharge).default([]),
    templates,
  })
  .superRefine((config, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const roomsById = new Map(config.rooms.map((r) => [r.id, r]));
    const seenRoomIds = new Set<string>();
    const seenRoomNames = new Set<string>();
    config.rooms.forEach((r, i) => {
      if (seenRoomIds.has(r.id)) issue(["rooms", i, "id"], "Duplicate room");
      seenRoomIds.add(r.id);
      const name = r.name.toLowerCase();
      if (seenRoomNames.has(name)) issue(["rooms", i, "name"], "Duplicate room name");
      seenRoomNames.add(name);
    });
    if (config.rooms.filter((r) => r.roomType === "MASTER").length !== 1) {
      issue(["rooms"], "Exactly one master room is required");
    }
    if (config.rooms.reduce((s, r) => s + r.airconUnits, 0) < 1) {
      issue(["rooms"], "The household needs at least one aircon unit");
    }

    const ids = new Set<string>();
    config.people.forEach((p, i) => {
      if (ids.has(p.personId)) issue(["people", i, "personId"], "Duplicate person");
      ids.add(p.personId);
    });

    const owners = config.people.filter((p) => p.role === "OWNER");
    const primaries = config.people.filter((p) => p.role === "PRIMARY");
    if (owners.length !== 1) issue(["people"], "Exactly one owner is required");
    if (primaries.length > 1) issue(["people"], "At most one primary tenant");

    const occupiedRooms = new Set<string>();
    config.people.forEach((p, i) => {
      if (p.role !== "TENANT" && p.utilityShares) {
        issue(["people", i], "Owner and primary tenant take the remainder, not fixed shares");
      }
      const home = roomsById.get(p.roomId);
      if (!home) {
        issue(["people", i, "roomId"], "Unknown room");
      } else if (p.role !== "TENANT" && home.roomType !== "MASTER") {
        issue(["people", i, "roomId"], "Owner and primary tenant belong in the master room");
      } else if (p.role === "TENANT" && home.roomType !== "TENANT") {
        issue(["people", i, "roomId"], "A tenant belongs in a tenant room");
      } else if (p.role === "TENANT" && occupiedRooms.has(p.roomId)) {
        issue(["people", i, "roomId"], "A tenant room holds one tenant");
      }
      occupiedRooms.add(p.roomId);
      for (const [type, r] of Object.entries(p.routes)) {
        if (r?.kind !== "VIA") continue;
        if (r.viaPersonId === p.personId) {
          issue(["people", i, "routes", type], "A person cannot pay via themselves");
        } else if (!ids.has(r.viaPersonId)) {
          issue(["people", i, "routes", type], "Unknown person to pay via");
        }
      }
    });

    const { rent, utilities, aircon } = config.categories;
    const hasPrimary = primaries.length === 1;
    (
      [
        ["rent", rent],
        ["utilities", utilities],
        ["aircon", aircon],
      ] as const
    ).forEach(([name, c]) => {
      if (c.ownerBps + c.primaryBps !== 10000) {
        issue(["categories", name], "Owner and primary percentages must add to 100%");
      } else if (!hasPrimary && c.ownerBps !== 10000) {
        issue(["categories", name], "Without a primary tenant the owner takes 100%");
      }
    });

    const tenantShares = config.people.reduce((s, p) => s + p.utilityShares, 0);
    if (tenantShares > utilities.totalShares) {
      issue(["categories", "utilities", "totalShares"], "Tenant shares exceed the total");
    }

    // Only this sum lives here. The amounts themselves are in the backend's room-amounts helper.
    const includedRent = config.rooms.reduce(
      (s, r) => (r.roomType === "TENANT" && r.includeInTotal && occupiedRooms.has(r.id) ? s + r.rentCents : s),
      0,
    );
    if (includedRent > rent.landlordRentCents) {
      issue(["categories", "rent", "landlordRentCents"], "Master room rent cannot be below zero");
    }

    const recurringIds = new Set<string>();
    config.recurring.forEach((r, i) => {
      if (recurringIds.has(r.id)) issue(["recurring", i, "id"], "Duplicate recurring charge");
      recurringIds.add(r.id);
      if (!ids.has(r.personId)) issue(["recurring", i, "personId"], "Unknown person");
    });

    config.templates.overrides.forEach((o, i) => {
      if (!ids.has(o.personId)) issue(["templates", "overrides", i, "personId"], "Unknown person");
    });

    for (const personId of Object.keys(config.templates.sectionTitles)) {
      if (!ids.has(personId)) issue(["templates", "sectionTitles", personId], "Unknown person");
    }
  });

/** A parsed household config, with defaults filled in. */
export type HouseholdConfig = z.infer<typeof householdConfigSchema>;

/** A household config as typed or sent, before defaults are filled in. Forms use this. */
export type HouseholdConfigInput = z.input<typeof householdConfigSchema>;

/** One person's entry in a household config. */
export type PersonConfig = HouseholdConfig["people"][number];

/** One room in a household config. */
export type HouseholdRoom = HouseholdConfig["rooms"][number];

/**
 * Parses the JSON stored on a HouseholdVersion.
 *
 * @param schemaVersion The row's `schemaVersion`.
 * @param json The row's `config`.
 * @returns The parsed config.
 * @throws {Error} When `schemaVersion` is one this code does not know, so an old row is never silently misread.
 * @throws {ZodError} When `json` does not match the schema.
 */
export function parseHouseholdConfig(schemaVersion: number, json: unknown): HouseholdConfig {
  if (schemaVersion !== HOUSEHOLD_SCHEMA_VERSION) {
    throw new Error(`Unsupported household schemaVersion ${schemaVersion}`);
  }
  return householdConfigSchema.parse(json);
}
