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

const params = (month: string, personId: string) => ({ params: Promise.resolve({ month, personId }) });
const post = (body: unknown) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });

/** Points the mocked Prisma client at November with its bill saved and Priya's rent. */
function useNovember() {
  Object.assign(prisma, {
    month: {
      findUnique: async () => ({
        householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
      }),
    },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true, whatsappE164: null },
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false, whatsappE164: "+6580000000" },
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
      findMany: async () => [],
      create: async ({ data }: { data: { kind: string; chargeId: string | null; openedAt: Date } }) => ({
        id: "event-1",
        kind: data.kind,
        chargeId: data.chargeId,
        openedAt: data.openedAt,
      }),
    },
  });
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-02T10:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/months/:month/recipients/:personId/message-events", () => {
  it("records the open, parsing with the shared schema", async () => {
    useNovember();
    const response = await POST(post({ kind: "MONTHLY" }), params("2026-11", PERSON_IDS.priya));
    expect(response.status).toBe(200);
    expect(messageEventResponseSchema.parse(await response.json())).toEqual({
      id: "event-1",
      kind: "MONTHLY",
      chargeId: null,
      openedAt: "2026-11-02T02:00:00.000Z",
    });
  });

  it("returns 400 for a month that is not YYYY-MM", async () => {
    useNovember();
    const response = await POST(post({ kind: "MONTHLY" }), params("Nov", PERSON_IDS.priya));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it.each([
    ["an unknown kind", { kind: "EMAIL" }],
    ["a nudge without a charge", { kind: "NUDGE" }],
  ])("returns 400 for %s", async (_, body) => {
    useNovember();
    const response = await POST(post(body), params("2026-11", PERSON_IDS.priya));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 404 no_charge for a nudge about someone else's charge", async () => {
    useNovember();
    const response = await POST(post({ kind: "NUDGE", chargeId: "sam-rent" }), params("2026-11", PERSON_IDS.priya));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_charge");
  });

  it("returns 404 no_person for the owner", async () => {
    useNovember();
    const response = await POST(post({ kind: "MONTHLY" }), params("2026-11", PERSON_IDS.alex));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_person");
  });
});
