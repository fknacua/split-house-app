import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import type { BreakdownCharge } from "@/lib/messages/build-breakdown";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { renderMonthlyMessage, renderNudgeMessage } from "@/lib/messages/render";
import { createSendEvent, type SendEventDb } from "./send-event.service";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false },
];

const NAMES = PEOPLE.map((p) => ({ id: p.id, name: p.name }));

const JORDAN_RENT: BreakdownCharge & { id: string } = {
  id: "jordan-rent",
  personId: PERSON_IDS.jordan,
  month: "2026-11",
  category: "RENT",
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01T00:00:00+08:00"),
  payViaPersonId: null,
  paidCents: null,
};

const JORDAN_UTILITIES = {
  ...JORDAN_RENT,
  id: "jordan-utilities",
  category: "UTILITIES" as const,
  label: "Utilities",
  amountCents: 8246,
  dueDate: null,
};

/** An earlier month's unpaid correction, which rides in November's message and can be nudged. */
const JORDAN_OCT_CORRECTION = {
  ...JORDAN_RENT,
  id: "jordan-oct-correction",
  month: "2026-10",
  category: "CORRECTION" as const,
  label: "Correction",
  amountCents: 1500,
  dueDate: null,
};

const CHARGES = [JORDAN_RENT, JORDAN_UTILITIES, JORDAN_OCT_CORRECTION];

/** A database with November open and its bill saved, unless told otherwise, that keeps what is created. */
function fakeDb({ open = true, bill = true } = {}) {
  const created: unknown[] = [];
  const db: SendEventDb = {
    messageTemplates: { findUnique: async () => null },
    month: {
      findUnique: async () =>
        open ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    person: { findMany: async () => PEOPLE },
    bill: { findUnique: async () => (bill ? { currentChargesCents: 41230 } : null) },
    charge: { findMany: async () => CHARGES },
    messageEvent: {
      createManyAndReturn: async (args) => {
        created.push(...args.data);
        return args.data.map((d, i) => ({ id: `event-${i + 1}`, kind: d.kind, chargeId: d.chargeId, openedAt: d.openedAt }));
      },
    },
  };
  return { db, created };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-02T10:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("createSendEvent", () => {
  it("stores the monthly message as the renderer writes it, recorded now", async () => {
    const { db, created } = fakeDb();
    const event = await createSendEvent(db, { kind: "MONTHLY", month: "2026-11", personId: PERSON_IDS.jordan });
    const text = renderMonthlyMessage({
      month: "2026-11",
      recipientId: PERSON_IDS.jordan,
      recipientName: "Jordan",
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      billCents: 41230,
      people: NAMES,
      charges: CHARGES,
    }).text;

    expect(event).toEqual({
      events: [{ id: "event-1", kind: "MONTHLY", chargeId: null, openedAt: "2026-11-02T02:00:00.000Z" }],
    });
    expect(created).toEqual([
      {
        month: "2026-11",
        personId: PERSON_IDS.jordan,
        kind: "MONTHLY",
        chargeId: null,
        renderedText: text,
        openedAt: new Date("2026-11-02T10:00:00+08:00"),
      },
    ]);
  });

  it("stores one NUDGE event per charge, each with the whole nudge's text and the same time", async () => {
    const { db, created } = fakeDb();
    const result = await createSendEvent(db, {
      kind: "NUDGE",
      month: "2026-11",
      personId: PERSON_IDS.jordan,
      chargeIds: ["jordan-rent", "jordan-utilities"],
    });
    const text = renderNudgeMessage({
      recipientId: PERSON_IDS.jordan,
      recipientName: "Jordan",
      month: "2026-11",
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      people: NAMES,
      charges: [JORDAN_RENT, JORDAN_UTILITIES],
    }).text;

    expect(result.events.map((e) => e.chargeId)).toEqual(["jordan-rent", "jordan-utilities"]);
    expect(new Set(result.events.map((e) => e.openedAt))).toEqual(new Set(["2026-11-02T02:00:00.000Z"]));
    expect(created).toEqual(
      ["jordan-rent", "jordan-utilities"].map((chargeId) => ({
        month: "2026-11",
        personId: PERSON_IDS.jordan,
        kind: "NUDGE",
        chargeId,
        renderedText: text,
        openedAt: new Date("2026-11-02T10:00:00+08:00"),
      })),
    );
  });

  it("accepts a nudge about an earlier month's unpaid correction", async () => {
    const { db, created } = fakeDb();
    await createSendEvent(db, {
      kind: "NUDGE",
      month: "2026-11",
      personId: PERSON_IDS.jordan,
      chargeIds: ["jordan-oct-correction"],
    });
    expect(created).toMatchObject([{ month: "2026-11", chargeId: "jordan-oct-correction" }]);
  });

  it("throws 409 no_bill for a monthly message before the bill is saved", async () => {
    const { db, created } = fakeDb({ bill: false });
    await expect(
      createSendEvent(db, { kind: "MONTHLY", month: "2026-11", personId: PERSON_IDS.jordan }),
    ).rejects.toMatchObject({ status: 409, code: "no_bill" });
    expect(created).toEqual([]);
  });

  it("throws 404 no_charge and stores nothing when any named charge is not theirs", async () => {
    const { db, created } = fakeDb();
    await expect(
      createSendEvent(db, {
        kind: "NUDGE",
        month: "2026-11",
        personId: PERSON_IDS.jordan,
        chargeIds: ["jordan-rent", "someone-else"],
      }),
    ).rejects.toMatchObject({ status: 404, code: "no_charge" });
    expect(created).toEqual([]);
  });

  it("throws 404 no_month for a month that is not open", async () => {
    await expect(
      createSendEvent(fakeDb({ open: false }).db, { kind: "MONTHLY", month: "2026-12", personId: PERSON_IDS.jordan }),
    ).rejects.toMatchObject({ status: 404, code: "no_month" });
  });

  it.each([
    ["the owner", PERSON_IDS.alex],
    ["an unknown person", "nobody"],
  ])("throws 404 no_person for %s", async (_, personId) => {
    await expect(createSendEvent(fakeDb().db, { kind: "MONTHLY", month: "2026-11", personId })).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });
});
