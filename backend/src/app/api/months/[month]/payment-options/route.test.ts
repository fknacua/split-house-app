import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, paymentOptionsResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const params = (month: string) => ({ params: Promise.resolve({ month }) });

/** Points the mocked Prisma client at November, open or not, with Sam's utilities paid via Priya unpaid. */
function useNovember(open: boolean) {
  Object.assign(prisma, {
    month: { findUnique: async () => (open ? { month: "2026-11" } : null) },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
        { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
      ],
    },
    charge: {
      findMany: async () => [
        {
          id: "sam-utilities",
          personId: PERSON_IDS.sam,
          month: "2026-11",
          category: "UTILITIES",
          label: "Utilities",
          amountCents: 8246,
          dueDate: null,
          payViaPersonId: PERSON_IDS.priya,
          paidCents: null,
          paidOn: null,
          person: { name: "Sam" },
          householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
        },
      ],
    },
  });
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/months/:month/payment-options", () => {
  it("returns the From and For lists, parsing with the shared schema", async () => {
    useNovember(true);
    const response = await GET(new Request("http://localhost"), params("2026-11"));
    expect(response.status).toBe(200);
    const options = paymentOptionsResponseSchema.parse(await response.json());
    expect(options.people).toMatchObject([
      { name: "Priya", detail: "1 unpaid · $82.46", charges: [{ label: "Utilities · Sam · Nov" }] },
    ]);
  });

  it("returns 400 for a month that is not YYYY-MM", async () => {
    useNovember(true);
    const response = await GET(new Request("http://localhost"), params("Nov"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 404 no_month for a month that is not open", async () => {
    useNovember(false);
    const response = await GET(new Request("http://localhost"), params("2026-12"));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_month");
  });
});
