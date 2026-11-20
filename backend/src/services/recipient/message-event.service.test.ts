import { HOUSEHOLD_SCHEMA_VERSION, type RecipientResponse } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { renderNudgeMessage } from "@/lib/messages/render";
import { buildRecipient, type RecipientChargeRow } from "@/lib/recipient/build-recipient";
import { createMessageEvent, type MessageEventDb } from "./message-event.service";
import { loadRecipientInput } from "./recipient.service";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", isOwner: true, whatsappE164: null },
  { id: PERSON_IDS.jordan, name: "Jordan", isOwner: false, whatsappE164: "+6580000000" },
];

const JORDAN_RENT: RecipientChargeRow = {
  id: "jordan-rent",
  personId: PERSON_IDS.jordan,
  month: "2026-11",
  category: "RENT",
  label: "Rent",
  amountCents: 95000,
  dueDate: new Date("2026-11-01T00:00:00+08:00"),
  payViaPersonId: null,
  paidCents: null,
  paidOn: null,
};

const JORDAN_UTILITIES: RecipientChargeRow = {
  ...JORDAN_RENT,
  id: "jordan-utilities",
  category: "UTILITIES",
  label: "Utilities",
  amountCents: 8246,
  dueDate: null,
};

/** An earlier month's unpaid correction, which rides in November's message and can be nudged. */
const JORDAN_OCT_CORRECTION: RecipientChargeRow = {
  ...JORDAN_RENT,
  id: "jordan-oct-correction",
  month: "2026-10",
  category: "CORRECTION",
  label: "Correction",
  amountCents: 1500,
  dueDate: null,
};

/** A database with November open and its bill saved, unless told otherwise, that keeps what is created. */
/** The message card, failing the test with a clear error when the layout has none (the paid layouts). */
function messageOf(r: RecipientResponse): NonNullable<RecipientResponse["message"]> {
  if (!r.message) throw new Error("expected a message");
  return r.message;
}

function fakeDb({ open = true, bill = true } = {}) {
  const created: unknown[] = [];
  const db: MessageEventDb = {
    messageTemplates: { findUnique: async () => null },
    month: {
      findFirst: async () => ({ month: "2026-11" }),
      findUnique: async () =>
        open ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    person: { findMany: async () => PEOPLE },
    bill: { findUnique: async () => (bill ? { currentChargesCents: 41230 } : null) },
    charge: { findMany: async () => [JORDAN_RENT, JORDAN_UTILITIES, JORDAN_OCT_CORRECTION] },
    messageEvent: {
      findMany: async () => [],
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

describe("createMessageEvent", () => {
  it("stores the monthly message exactly as Recipient previews it, opened now", async () => {
    const { db, created } = fakeDb();
    const event = await createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "MONTHLY" });
    const preview = buildRecipient(await loadRecipientInput(db, "2026-11", PERSON_IDS.jordan));

    expect(event).toEqual({
      events: [{ id: "event-1", kind: "MONTHLY", chargeId: null, openedAt: "2026-11-02T02:00:00.000Z" }],
    });
    expect(created).toEqual([
      {
        month: "2026-11",
        personId: PERSON_IDS.jordan,
        kind: "MONTHLY",
        chargeId: null,
        renderedText: messageOf(preview).text,
        openedAt: new Date("2026-11-02T10:00:00+08:00"),
      },
    ]);
  });

  it("stores one NUDGE event per charge, each with the whole nudge's text and the same time", async () => {
    const { db, created } = fakeDb();
    const result = await createMessageEvent(db, "2026-11", PERSON_IDS.jordan, {
      kind: "NUDGE",
      chargeIds: ["jordan-rent", "jordan-utilities"],
    });
    const text = renderNudgeMessage({
      recipientId: PERSON_IDS.jordan,
      recipientName: "Jordan",
      month: "2026-11",
      config: NOV_2026_CONFIG,
      templates: DEFAULT_MESSAGE_TEMPLATES,
      people: PEOPLE,
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
    await createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "NUDGE", chargeIds: ["jordan-oct-correction"] });
    expect(created).toMatchObject([{ month: "2026-11", chargeId: "jordan-oct-correction" }]);
  });

  it("throws 409 no_bill for a monthly message before the bill is saved", async () => {
    const { db, created } = fakeDb({ bill: false });
    await expect(createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "MONTHLY" })).rejects.toMatchObject({
      status: 409,
      code: "no_bill",
    });
    expect(created).toEqual([]);
  });

  it("throws 404 no_charge and stores nothing when any named charge is not theirs", async () => {
    const { db, created } = fakeDb();
    await expect(
      createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "NUDGE", chargeIds: ["jordan-rent", "someone-else"] }),
    ).rejects.toMatchObject({ status: 404, code: "no_charge" });
    expect(created).toEqual([]);
  });

  it("throws 404 no_month and no_person as Recipient does", async () => {
    await expect(
      createMessageEvent(fakeDb({ open: false }).db, "2026-12", PERSON_IDS.jordan, { kind: "MONTHLY" }),
    ).rejects.toMatchObject({ status: 404, code: "no_month" });
    await expect(createMessageEvent(fakeDb().db, "2026-11", PERSON_IDS.alex, { kind: "MONTHLY" })).rejects.toMatchObject({
      status: 404,
      code: "no_person",
    });
  });
});
