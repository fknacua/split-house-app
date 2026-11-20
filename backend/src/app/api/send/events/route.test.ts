import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, messageEventResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const post = (body: unknown) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });

/** Points the mocked Prisma client at November with its bill saved and Priya's rent. */
function useNovember() {
  Object.assign(prisma, {
    messageTemplates: { findUnique: async () => null },
    month: {
      findUnique: async () => ({
        householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
      }),
    },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
      ],
    },
    bill: { findUnique: async () => ({ currentChargesCents: 41230 }) },
    charge: {
      findMany: async () => [
        {
          id: "priya-rent",
          personId: PERSON_IDS.priya,
          month: "2026-11",
          category: "RENT",
          label: "Rent",
          amountCents: 167500,
          dueDate: new Date("2026-11-07T00:00:00+08:00"),
          payViaPersonId: null,
          paidCents: null,
        },
      ],
    },
    messageEvent: {
      createManyAndReturn: async ({ data }: { data: { kind: string; chargeId: string | null; openedAt: Date }[] }) =>
        data.map((d, i) => ({ id: `event-${i + 1}`, kind: d.kind, chargeId: d.chargeId, openedAt: d.openedAt })),
    },
  });
}

const MONTHLY = { kind: "MONTHLY", month: "2026-11", personId: PERSON_IDS.priya };

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-02T10:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/send/events", () => {
  it("records the monthly message, parsing with the shared schema", async () => {
    useNovember();
    const response = await POST(post(MONTHLY), undefined);
    expect(response.status).toBe(200);
    expect(messageEventResponseSchema.parse(await response.json())).toEqual({
      events: [{ id: "event-1", kind: "MONTHLY", chargeId: null, openedAt: "2026-11-02T02:00:00.000Z" }],
    });
  });

  it("records a nudge about the named charges, parsing with the shared schema", async () => {
    useNovember();
    const response = await POST(post({ ...MONTHLY, kind: "NUDGE", chargeIds: ["priya-rent"] }), undefined);
    expect(response.status).toBe(200);
    expect(messageEventResponseSchema.parse(await response.json()).events).toMatchObject([
      { kind: "NUDGE", chargeId: "priya-rent" },
    ]);
  });

  it.each([
    ["a month that is not YYYY-MM", { ...MONTHLY, month: "Nov" }],
    ["no month", { kind: "MONTHLY", personId: PERSON_IDS.priya }],
    ["no person", { kind: "MONTHLY", month: "2026-11" }],
    ["an unknown kind", { ...MONTHLY, kind: "EMAIL" }],
    ["a nudge without a charge", { ...MONTHLY, kind: "NUDGE" }],
    ["a nudge with no charges", { ...MONTHLY, kind: "NUDGE", chargeIds: [] }],
    ["a nudge naming a charge twice", { ...MONTHLY, kind: "NUDGE", chargeIds: ["priya-rent", "priya-rent"] }],
  ])("returns 400 for %s", async (_, body) => {
    useNovember();
    const response = await POST(post(body), undefined);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 404 no_charge for a nudge about someone else's charge", async () => {
    useNovember();
    const response = await POST(post({ ...MONTHLY, kind: "NUDGE", chargeIds: ["sam-rent"] }), undefined);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_charge");
  });

  it("returns 404 no_person for the owner", async () => {
    useNovember();
    const response = await POST(post({ ...MONTHLY, personId: PERSON_IDS.alex }), undefined);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_person");
  });

  it("returns 409 no_bill for a monthly message before the bill is saved", async () => {
    useNovember();
    Object.assign(prisma, { bill: { findUnique: async () => null } });
    const response = await POST(post(MONTHLY), undefined);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("no_bill");
  });
});
