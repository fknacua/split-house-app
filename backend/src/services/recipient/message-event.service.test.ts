import { HOUSEHOLD_SCHEMA_VERSION } from "@splithouse/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
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
};

/** A database with November open and its bill saved, unless told otherwise, that keeps what is created. */
function fakeDb({ open = true, bill = true } = {}) {
  const created: unknown[] = [];
  const db: MessageEventDb = {
    month: {
      findUnique: async () =>
        open ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    person: { findMany: async () => PEOPLE },
    bill: { findUnique: async () => (bill ? { currentChargesCents: 41230 } : null) },
    charge: { findMany: async () => [JORDAN_RENT] },
    messageEvent: {
      findMany: async () => [],
      create: async (args) => {
        created.push(args.data);
        return { id: "event-1", kind: args.data.kind, chargeId: args.data.chargeId, openedAt: args.data.openedAt };
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

    expect(event).toEqual({ id: "event-1", kind: "MONTHLY", chargeId: null, openedAt: "2026-11-02T02:00:00.000Z" });
    expect(created).toEqual([
      {
        month: "2026-11",
        personId: PERSON_IDS.jordan,
        kind: "MONTHLY",
        chargeId: null,
        renderedText: preview.message.text,
        openedAt: new Date("2026-11-02T10:00:00+08:00"),
      },
    ]);
  });

  it("stores a nudge about one of the person's charges", async () => {
    const { db, created } = fakeDb();
    const event = await createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "NUDGE", chargeId: "jordan-rent" });

    expect(event).toMatchObject({ kind: "NUDGE", chargeId: "jordan-rent" });
    expect(created[0]).toMatchObject({
      renderedText: renderNudgeMessage({
        recipientId: PERSON_IDS.jordan,
        recipientName: "Jordan",
        config: NOV_2026_CONFIG,
        charge: JORDAN_RENT,
      }),
    });
  });

  it("throws 409 no_bill for a monthly message before the bill is saved", async () => {
    const { db, created } = fakeDb({ bill: false });
    await expect(createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "MONTHLY" })).rejects.toMatchObject({
      status: 409,
      code: "no_bill",
    });
    expect(created).toEqual([]);
  });

  it("throws 404 no_charge for a nudge about a charge that is not theirs this month", async () => {
    const { db, created } = fakeDb();
    await expect(
      createMessageEvent(db, "2026-11", PERSON_IDS.jordan, { kind: "NUDGE", chargeId: "someone-else" }),
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
