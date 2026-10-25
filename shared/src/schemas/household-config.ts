import { z } from "zod";
import { cents, monthKey } from "./primitives";

/**
 * Version of the shape of `HouseholdVersion.config` (see docs/SplitHouse — Data Model.md).
 * Money is integer cents, shares are thousandths (1.5 shares = 1500), splits are
 * basis points (5000 = 50%). Bump it when the shape changes.
 */
export const HOUSEHOLD_SCHEMA_VERSION = 1;

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

const personConfig = z.object({
  personId: z.string().min(1),
  role,
  // Fixed rent for tenants with their own room. Owner and primary tenant get their
  // rent from the remainder split of the rent category instead.
  rentCents: nonNegativeInt.default(0),
  // Tenants only. Owner and primary tenant take the remainder of the total.
  utilityShares: nonNegativeInt.default(0),
  airconUnits: nonNegativeInt.default(0),
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
  // The shared (master) room rent split between owner and primary tenant.
  sharedRentCents: nonNegativeInt,
});

const utilitiesCategory = remainderCategory.extend({
  totalShares: z.number().int().positive(),
  // Day of the month the utilities bill is due. Home uses it before a bill exists;
  // an uploaded bill's own due date supersedes it.
  billDueDay: dueDay.optional(),
});

const airconCategory = remainderCategory.extend({
  totalUnits: z.number().int().positive(),
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
});

/**
 * The household settings of one version: people, the rent, utilities and
 * aircon categories, recurring charges and message templates. Rejects configs
 * whose shares, percentages or references do not add up.
 */
export const householdConfigSchema = z
  .object({
    people: z.array(personConfig).min(1),
    categories: z.object({
      rent: rentCategory,
      utilities: utilitiesCategory,
      aircon: airconCategory,
    }),
    recurring: z.array(recurringCharge).default([]),
    templates,
  })
  .superRefine((config, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const ids = new Set<string>();
    config.people.forEach((p, i) => {
      if (ids.has(p.personId)) issue(["people", i, "personId"], "Duplicate person");
      ids.add(p.personId);
    });

    const owners = config.people.filter((p) => p.role === "OWNER");
    const primaries = config.people.filter((p) => p.role === "PRIMARY");
    if (owners.length !== 1) issue(["people"], "Exactly one owner is required");
    if (primaries.length > 1) issue(["people"], "At most one primary tenant");

    config.people.forEach((p, i) => {
      if (p.role !== "TENANT" && (p.rentCents || p.utilityShares || p.airconUnits)) {
        issue(
          ["people", i],
          "Owner and primary tenant take the remainder, not fixed rent, shares or units",
        );
      }
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
    const tenantUnits = config.people.reduce((s, p) => s + p.airconUnits, 0);
    if (tenantUnits > aircon.totalUnits) {
      issue(["categories", "aircon", "totalUnits"], "Tenant units exceed the total");
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
  });

/** A parsed household config, with defaults filled in. */
export type HouseholdConfig = z.infer<typeof householdConfigSchema>;

/** A household config as typed or sent, before defaults are filled in. Forms use this. */
export type HouseholdConfigInput = z.input<typeof householdConfigSchema>;

/** One person's entry in a household config. */
export type PersonConfig = HouseholdConfig["people"][number];

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
