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

interface FakeOptions {
  charge?: ChargeDetailsCharge | null;
  hasBill?: boolean;
  messages?: ChargeDetailsMessage[];
}

/** A November with Jordan's utilities and Priya's paid utilities; records the month each query asked for. */
function fakeDb({ charge = UTILITIES, hasBill = true, messages = [MONTHLY] }: FakeOptions = {}) {
  const months: string[] = [];
  const db: ChargeDetailsDb = {
    charge: {
      findUnique: async () =>
        charge && { ...charge, householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } },
      findMany: async ({ where }) => {
        months.push(where.month);
        return [
          { personId: PERSON_IDS.jordan, payViaPersonId: null, category: "UTILITIES", paidCents: null },
          { personId: PERSON_IDS.priya, payViaPersonId: null, category: "UTILITIES", paidCents: 8246 },
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

  it("answers 404 no_charge for an unknown charge", async () => {
    await expect(getChargeDetails(fakeDb({ charge: null }).db, "nope")).rejects.toMatchObject({
      status: 404,
      code: "no_charge",
    });
  });
});
