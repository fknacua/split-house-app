import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, sendResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { POST } from "./preview/route";
import { GET } from "./route";

const { alex, priya, jordan } = PERSON_IDS;

/** Points the mocked Prisma client at November, open or not, with Jordan's rent overdue after his message. */
function useNovember(open = true) {
  Object.assign(prisma, {
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
        { id: jordan, name: "Jordan", whatsappE164: "+6580000003" },
      ],
    },
    bill: { findUnique: async () => ({ currentChargesCents: 41230 }) },
    charge: {
      findMany: async () => [
        {
          id: "jordan-rent",
          personId: jordan,
          month: "2026-11",
          category: "RENT",
          label: "Rent",
          amountCents: 95000,
          dueDate: new Date("2026-11-01T00:00:00+08:00"),
          payViaPersonId: null,
          paidCents: null,
        },
        {
          id: "jordan-utilities",
          personId: jordan,
          month: "2026-11",
          category: "UTILITIES",
          label: "Utilities",
          amountCents: 8246,
          dueDate: new Date("2026-11-04T00:00:00+08:00"),
          payViaPersonId: null,
          paidCents: null,
        },
      ],
    },
    messageEvent: {
      findMany: async () => [
        { personId: jordan, kind: "MONTHLY", chargeId: null, openedAt: new Date("2026-11-02T10:00:00+08:00") },
      ],
    },
  });
}

const get = (query: string) => GET(new Request(`http://localhost/api/send?${query}`), undefined);
const post = (body: unknown) =>
  POST(new Request("http://localhost/api/send/preview", { method: "POST", body: JSON.stringify(body) }), undefined);

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-05T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/send", () => {
  it("returns the nudge sheet with the tapped charge ticked, parsing with the shared schema", async () => {
    useNovember();
    const response = await get(`mode=nudge&personId=${jordan}&chargeIds=jordan-utilities`);
    expect(response.status).toBe(200);
    const sheet = sendResponseSchema.parse(await response.json());
    expect(sheet).toMatchObject({
      mode: "nudge",
      title: "Send nudge message",
      to: { personId: jordan },
      charges: { label: "Overdue charges", sub: "Utilities · Nov" },
      send: {
        label: "Send on WhatsApp",
        target: { record: { kind: "NUDGE", month: "2026-11", personId: jordan, chargeIds: ["jordan-utilities"] } },
      },
    });
  });

  it("returns the monthly sheet with nobody picked, parsing with the shared schema", async () => {
    useNovember();
    const response = await get("mode=monthly");
    expect(response.status).toBe(200);
    const sheet = sendResponseSchema.parse(await response.json());
    expect(sheet.to).toMatchObject({ personId: null, options: [{ personId: jordan, detail: "Sent 2 Nov" }] });
  });

  it.each([
    ["no mode", ""],
    ["an unknown mode", "mode=email"],
    ["an empty personId", "mode=monthly&personId="],
  ])("returns 400 invalid_request for %s", async (_, query) => {
    useNovember();
    const response = await get(query);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 404 no_month when the active month is not open", async () => {
    useNovember(false);
    const response = await get("mode=monthly");
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_month");
  });

  it.each([
    ["the owner", `mode=monthly&personId=${alex}`],
    ["someone with nothing overdue", `mode=nudge&personId=${priya}`],
  ])("returns 404 no_person for %s", async (_, query) => {
    useNovember();
    const response = await get(query);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_person");
  });
});

describe("POST /api/send/preview", () => {
  it("returns the nudge sheet with the given ticks, parsing with the shared schema", async () => {
    useNovember();
    const response = await post({ personId: jordan, chargeIds: ["jordan-rent", "jordan-utilities"] });
    expect(response.status).toBe(200);
    const sheet = sendResponseSchema.parse(await response.json());
    expect(sheet.charges).toMatchObject({ amount: "$1,032.46", sub: "2 charges", selected: "2 of 2 overdue selected" });
  });

  it.each([
    ["no personId", { chargeIds: [] }],
    ["no chargeIds", { personId: jordan }],
    ["a chargeIds that is not a list", { personId: jordan, chargeIds: "jordan-rent" }],
  ])("returns 400 invalid_request for %s", async (_, body) => {
    useNovember();
    const response = await post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 400 invalid_request for a body that is not JSON", async () => {
    useNovember();
    const response = await POST(
      new Request("http://localhost/api/send/preview", { method: "POST", body: "nope" }),
      undefined,
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 no_month when the active month is not open", async () => {
    useNovember(false);
    const response = await post({ personId: jordan, chargeIds: [] });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_month");
  });

  it("returns 404 no_person for someone with nothing to nudge", async () => {
    useNovember();
    const response = await post({ personId: priya, chargeIds: [] });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_person");
  });
});
