import { z } from "zod";

// Shape of HouseholdVersion.config (see docs/SplitHouse — Data Model.md).
// Money is integer cents, shares are thousandths (1.5 shares = 1500), splits are
// basis points (5000 = 50%). Bump HOUSEHOLD_SCHEMA_VERSION when the shape changes.
export const HOUSEHOLD_SCHEMA_VERSION = 1;

export const CHARGE_TYPES = ["RENT", "UTILITIES", "AIRCON", "RECURRING"] as const;
export type ChargeType = (typeof CHARGE_TYPES)[number];

// Placeholders a message template may use.
export const TEMPLATE_PLACEHOLDERS = [
  "name",
  "month",
  "lines",
  "total",
  "dueDate",
  "charge",
  "amount",
] as const;

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");
const cents = z.number().int();
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

export type HouseholdConfig = z.infer<typeof householdConfigSchema>;
export type PersonConfig = HouseholdConfig["people"][number];

// Parse the JSON stored on a HouseholdVersion. Throws on a schemaVersion this code
// does not know, so an old row is never silently misread.
export function parseHouseholdConfig(schemaVersion: number, json: unknown): HouseholdConfig {
  if (schemaVersion !== HOUSEHOLD_SCHEMA_VERSION) {
    throw new Error(`Unsupported household schemaVersion ${schemaVersion}`);
  }
  return householdConfigSchema.parse(json);
}
