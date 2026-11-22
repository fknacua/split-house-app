import { HOUSEHOLD_SCHEMA_VERSION, sendResponseSchema } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import type { SendCharge, SendMessageEvent } from "@/lib/send/build-send";
import { getSendSheet, previewNudge, type SendDb } from "./send.service";

const { alex, priya, sam, jordan } = PERSON_IDS;

function charge(id: string, personId: string, category: SendCharge["category"], amountCents: number, due: string | null, payVia: string | null = null): SendCharge {
  return {
    id,
    personId,
    month: "2026-11",
    category,
    label: category === "RENT" ? "Rent" : "Utilities",
    amountCents,
    dueDate: due ? new Date(`${due}T00:00:00+08:00`) : null,
    payViaPersonId: payVia,
    paidCents: null,
    createdAt: new Date("2026-11-01T09:00:00+08:00"),
  };
}

const CHARGES = [
  charge("priya-rent", priya, "RENT", 167500, "2026-11-07"),
  charge("priya-utilities", priya, "UTILITIES", 12369, "2026-11-07"),
  charge("sam-utilities", sam, "UTILITIES", 8246, null, priya),
  charge("jordan-rent", jordan, "RENT", 95000, "2026-11-01"),
  charge("jordan-utilities", jordan, "UTILITIES", 8246, "2026-11-04"),
];

// Both messages are out; on 5 Nov only Jordan has anything overdue.
const MONTHLY: SendMessageEvent[] = [
  { personId: priya, kind: "MONTHLY", chargeId: null, openedAt: new Date("2026-11-02T10:00:00+08:00") },
  { personId: jordan, kind: "MONTHLY", chargeId: null, openedAt: new Date("2026-11-02T10:00:00+08:00") },
];

/** A database with November active and open, unless told otherwise; records what each query asked for. */
function fakeDb({ open = true, messages = MONTHLY } = {}) {
  const asked: unknown[] = [];
  const db: SendDb = {
    messageTemplates: { findUnique: async () => null },
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async () =>
        open ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    person: {
      findMany: async () => [
        { id: alex, name: "Alex", whatsappE164: null },
        { id: priya, name: "Priya", whatsappE164: "+6580000001" },
        { id: sam, name: "Sam", whatsappE164: "+6580000002" },
        { id: jordan, name: "Jordan", whatsappE164: "+6580000003" },
      ],
    },
    bill: { findUnique: async () => ({ currentChargesCents: 41230 }) },
    charge: {
      findMany: async (args) => {
        asked.push(args.where);
        return CHARGES;
      },
    },
    messageEvent: {
      findMany: async (args) => {
        asked.push(args.where);
        return messages;
      },
    },
  };
  return { db, asked };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-05T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("getSendSheet", () => {
  it("reads the active month's charges, earlier unpaid corrections and events, parsing with the shared schema", async () => {
    const { db, asked } = fakeDb();
    const sheet = sendResponseSchema.parse(await getSendSheet(db, { mode: "monthly", personId: priya }));
    expect(asked).toEqual([
      { OR: [{ month: "2026-11" }, { month: { lt: "2026-11" }, category: "CORRECTION", paidCents: null }] },
      { month: "2026-11" },
    ]);
    expect(sheet.month).toBe("2026-11");
    expect(sheet.to.personId).toBe(priya);
    expect(sheet.total?.amount).toBe("$1,881.15");
  });

  it("opens with nobody picked without a personId", async () => {
    const sheet = await getSendSheet(fakeDb().db, { mode: "monthly" });
    expect(sheet.to).toMatchObject({ personId: null, options: [{ personId: priya }, { personId: jordan }] });
  });

  it("ticks the tapped overdue charge in nudge mode", async () => {
    const sheet = await getSendSheet(fakeDb().db, { mode: "nudge", personId: jordan, chargeId: "jordan-utilities" });
    expect(sheet.charges?.rows.filter((r) => r.ticked).map((r) => r.chargeId)).toEqual(["jordan-utilities"]);
  });

  it("throws 404 no_month when the active month is not open", async () => {
    await expect(getSendSheet(fakeDb({ open: false }).db, { mode: "monthly" })).rejects.toMatchObject({
      status: 404,
      code: "no_month",
    });
  });

  it.each([
    ["the owner", "monthly", alex],
    ["someone paying via another person", "monthly", sam],
    ["an unknown person", "monthly", "person-nobody"],
    ["someone with nothing overdue", "nudge", priya],
    ["someone paying via another person, in nudge mode", "nudge", sam],
  ] as const)("throws 404 no_person for %s", async (_, mode, personId) => {
    await expect(getSendSheet(fakeDb().db, { mode, personId })).rejects.toMatchObject({ status: 404, code: "no_person" });
  });
});

describe("previewNudge", () => {
  it("returns the sheet with the given ticks, leaving out ids that are not overdue", async () => {
    const sheet = sendResponseSchema.parse(
      await previewNudge(fakeDb().db, { personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities", "priya-rent"] }),
    );
    expect(sheet.mode).toBe("nudge");
    expect(sheet.charges?.rows.map((r) => [r.chargeId, r.ticked])).toEqual([
      ["jordan-rent", true],
      ["jordan-utilities", true],
    ]);
    expect(sheet.send.target?.record).toEqual({
      kind: "NUDGE",
      month: "2026-11",
      personId: jordan,
      chargeIds: ["jordan-rent", "jordan-utilities"],
    });
  });

  it("throws 404 no_person for someone with nothing to nudge", async () => {
    await expect(previewNudge(fakeDb({ messages: [] }).db, { personId: jordan, chargeIds: [] })).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });
});
