import { chargeDetailsResponseSchema, HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChargeDetailsCharge, ChargeDetailsMessage } from "@/lib/charge-details/build-charge-details";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { getChargeDetails, type ChargeDetailsDb } from "./charge-details.service";

const UTILITIES: ChargeDetailsCharge = {
  id: "charge-jordan-utilities",
  month: "2026-11",
  personId: PERSON_IDS.jordan,
  payViaPersonId: null,
  category: "UTILITIES",
  label: "Utilities",
  amountCents: 8246,
  dueDate: new Date("2026-11-03"),
  paidCents: null,
  paidOn: null,
};

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const MONTHLY: ChargeDetailsMessage = {
  personId: PERSON_IDS.jordan,
  kind: "MONTHLY",
  chargeId: null,
  openedAt: new Date("2026-11-02T10:00:00+08:00"),
};

/** When the bill was saved: before the 2 Nov message. */
const CREATED = new Date("2026-11-01T09:00:00+08:00");

interface FakeOptions {
  charge?: ChargeDetailsCharge | null;
  hasBill?: boolean;
  messages?: ChargeDetailsMessage[];
  /** When the charge was added; the bill's save by default. */
  createdAt?: Date;
  /** For a correction, the charge it fixes. */
  correctsCharge?: { label: string; month: string } | null;
  corrections?: { amountCents: number; createdAt: Date }[];
  /** No month open at all. */
  noMonth?: boolean;
}

/** A November with Jordan's utilities and Priya's paid utilities; records the month each query asked for. */
function fakeDb({
  charge = UTILITIES,
  hasBill = true,
  messages = [MONTHLY],
  createdAt = CREATED,
  correctsCharge = null,
  corrections = [],
  noMonth = false,
}: FakeOptions = {}) {
  const months: string[] = [];
  const version = { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG };
  const db: ChargeDetailsDb = {
    month: { findFirst: async () => (noMonth ? null : { householdVersion: version }) },
    charge: {
      findUnique: async () => charge && { ...charge, createdAt, householdVersion: version, correctsCharge, corrections },
      findMany: async ({ where }) => {
        months.push(where.month);
        return [
          { personId: PERSON_IDS.jordan, payViaPersonId: null, category: "UTILITIES", amountCents: 8246, paidCents: null, createdAt: CREATED },
          { personId: PERSON_IDS.priya, payViaPersonId: null, category: "UTILITIES", amountCents: 8246, paidCents: 8246, createdAt: CREATED },
        ];
      },
    },
    person: { findMany: async () => PEOPLE },
    bill: { findUnique: async () => (hasBill ? { paidCents: null } : null) },
    billDraft: { findUnique: async () => null },
    messageEvent: {
      findMany: async ({ where }) => {
        months.push(where.month);
        return messages;
      },
    },
  };
  return { db, months };
}

describe("getChargeDetails", () => {
  beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
  afterEach(() => vi.unstubAllEnvs());

  it("reads the charge's own month and returns a response the shared schema accepts", async () => {
    const { db, months } = fakeDb({ messages: [MONTHLY, { ...MONTHLY, personId: PERSON_IDS.priya }] });
    const res = chargeDetailsResponseSchema.parse(await getChargeDetails(db, UTILITIES.id));
    expect(months).toEqual(["2026-11", "2026-11"]);
    expect(res.title).toBe("Utilities · Jordan");
    expect(res.activity).toEqual([{ title: "Monthly message sent", date: "02 Nov 2026" }]);
  });

  it("adds the payment check note on a due-today charge while the month is collecting", async () => {
    const { db } = fakeDb({ messages: [MONTHLY, { ...MONTHLY, personId: PERSON_IDS.priya }] });
    const res = await getChargeDetails(db, UTILITIES.id);
    expect(res.amount.note).toBe("You’ll get a payment check tonight if it’s still unpaid.");
  });

  it("leaves the note out while a monthly message is still unsent", async () => {
    // Priya has no monthly message yet, so the month is `unsent`.
    const res = await getChargeDetails(fakeDb().db, UTILITIES.id);
    expect(res.amount.note).toBeNull();
  });


  describe("the Not sent chip, by Home's rule", () => {
    const sentToBoth = [MONTHLY, { ...MONTHLY, personId: PERSON_IDS.priya }];

    it("is off for a charge already in the message that went out", async () => {
      const res = await getChargeDetails(fakeDb({ messages: sentToBoth }).db, UTILITIES.id);
      expect(res.amount.chip.label).not.toBe("Not sent");
    });

    it("is on while the payer's first message is still to go", async () => {
      const res = await getChargeDetails(fakeDb({ messages: [] }).db, UTILITIES.id);
      expect(res.amount.chip.label).toBe("Not sent");
    });

    it("is on again for a charge added after the payer's message", async () => {
      const fridge = { ...UTILITIES, id: "jordan-fridge", category: "ONE_OFF" as const, label: "Fridge repair", amountCents: 3000 };
      const db = fakeDb({ charge: fridge, messages: sentToBoth, createdAt: new Date("2026-11-21T10:00:00+08:00") }).db;
      expect((await getChargeDetails(db, fridge.id)).amount.chip.label).toBe("Not sent");
    });
  });
  describe("corrections", () => {
    const paid = { ...UTILITIES, paidCents: 8246, paidOn: new Date("2026-11-03") };

    it("offers Add correction on a paid utilities charge of someone in the newest month's household", async () => {
      const res = await getChargeDetails(fakeDb({ charge: paid }).db, paid.id);
      expect(res.footer.map((a) => a.label)).toEqual(["Edit payment", "Add correction"]);
    });

    it.each([
      ["an unpaid charge", UTILITIES],
      ["rent", { ...paid, category: "RENT" as const, label: "Rent" }],
      ["someone no longer in the household", { ...paid, personId: "person-former" }],
    ])("offers no Add correction for %s", async (_name, charge) => {
      const res = await getChargeDetails(fakeDb({ charge }).db, charge.id);
      expect(res.footer.map((a) => a.label)).not.toContain("Add correction");
    });

    it("passes the corrections to the Activity and what a correction fixes to its Fixes row", async () => {
      const corrected = await getChargeDetails(
        fakeDb({ charge: paid, corrections: [{ amountCents: -500, createdAt: new Date("2026-11-21T10:00:00+08:00") }] }).db,
        paid.id,
      );
      expect(corrected.amount.note).toBe("Corrected to $77.46 · 1 correction");
      const refund = { ...UTILITIES, id: "refund", category: "CORRECTION" as const, amountCents: -500, paidCents: -500, paidOn: new Date("2026-11-21") };
      const res = chargeDetailsResponseSchema.parse(
        await getChargeDetails(fakeDb({ charge: refund, correctsCharge: { label: "Utilities", month: "2026-10" } }).db, refund.id),
      );
      expect(res.facts).toContainEqual({ kind: "text", label: "Fixes", value: "Utilities · Oct 2026" });
      expect(res.footer.map((a) => a.label)).toEqual(["Delete correction"]);
    });
  });

  it("answers 404 no_charge for an unknown charge", async () => {
    await expect(getChargeDetails(fakeDb({ charge: null }).db, "nope")).rejects.toMatchObject({
      status: 404,
      code: "no_charge",
    });
  });
});
