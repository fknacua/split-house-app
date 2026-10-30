import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { chargePaymentResponseSchema, HOUSEHOLD_SCHEMA_VERSION, savePaymentResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

/** Points the mocked Prisma client at November with Jordan's rent, unpaid, or no charge. */
function useJordanRent(found: boolean, paidCents: number | null = null, month = "2026-11") {
  Object.assign(prisma, {
    month: { findFirst: async () => ({ month: "2026-11" }) },
    charge: {
      findUnique: async () =>
        found
          ? {
              id: "charge-jordan-rent",
              month,
              personId: PERSON_IDS.jordan,
              category: "RENT",
              label: "Rent",
              amountCents: 95000,
              dueDate: new Date("2026-11-01"),
              payViaPersonId: null,
              paidCents,
              paidOn: paidCents === null ? null : new Date("2026-11-02"),
              person: { name: "Jordan" },
              householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
            }
          : null,
      updateMany: async (args: { where: { paidCents?: null } }) => ({
        count: args.where.paidCents === null && paidCents !== null ? 0 : 1,
      }),
    },
  });
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/charges/:id/payment", () => {
  it("returns the sheet, parsing with the shared schema", async () => {
    useJordanRent(true);
    const response = await GET(new Request("http://localhost"), params("charge-jordan-rent"));
    expect(response.status).toBe(200);
    const sheet = chargePaymentResponseSchema.parse(await response.json());
    expect(sheet).toMatchObject({ subtitle: "Rent · Jordan · November", expected: "$950.00", amountCents: 95000 });
  });

  it("returns 404 no_charge for an unknown charge", async () => {
    useJordanRent(false);
    const response = await GET(new Request("http://localhost"), params("nope"));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_charge");
  });
});

describe("POST /api/charges/:id/payment", () => {
  const post = (id: string, body: unknown) =>
    POST(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }), params(id));

  it("returns the charge and its month, parsing with the shared schema", async () => {
    useJordanRent(true);
    const response = await post("charge-jordan-rent", { paidCents: 95000, paidOn: "2026-11-03" });
    expect(response.status).toBe(200);
    expect(savePaymentResponseSchema.parse(await response.json())).toEqual({
      chargeId: "charge-jordan-rent",
      month: "2026-11",
    });
  });

  it.each([
    ["the amount is zero", { paidCents: 0, paidOn: "2026-11-03" }],
    ["the amount is negative", { paidCents: -100, paidOn: "2026-11-03" }],
    ["the day is missing", { paidCents: 95000 }],
    ["the day is not a date", { paidCents: 95000, paidOn: "3 Nov" }],
    ["the day is after today", { paidCents: 95000, paidOn: "2026-11-04" }],
  ])("returns 400 when %s", async (_name, body) => {
    useJordanRent(true);
    const response = await post("charge-jordan-rent", body);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 404 no_charge for an unknown charge", async () => {
    useJordanRent(false);
    const response = await post("nope", { paidCents: 95000, paidOn: "2026-11-03" });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_charge");
  });

  it("returns 409 payment_locked when changing a payment in an earlier month", async () => {
    useJordanRent(true, 95000, "2026-10");
    const response = await post("charge-jordan-rent", { paidCents: 90000, paidOn: "2026-11-03" });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("payment_locked");
  });
});
