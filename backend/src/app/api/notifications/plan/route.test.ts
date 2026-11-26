import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, notificationPlanResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { NOTIFICATION_GROUP_ROWS } from "@/lib/notifications/rows";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const request = () => new Request("http://localhost/api/notifications/plan");

/** Points the mocked Prisma client at November with Sam's unpaid utilities, paid through Priya, and its bill. */
function useHousehold(months: unknown[]) {
  Object.assign(prisma, {
    month: { findMany: async () => months },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true },
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false },
        { id: PERSON_IDS.sam, name: "Sam", isOwner: false },
      ],
    },
    charge: {
      findMany: async () => [
        {
          id: "util-sam",
          month: "2026-11",
          personId: PERSON_IDS.sam,
          payViaPersonId: PERSON_IDS.priya,
          category: "UTILITIES",
          label: "Utilities",
          amountCents: 8246,
          dueDate: null,
          correctsCharge: null,
        },
      ],
    },
    bill: {
      findMany: async () => [
        { month: "2026-11", currentChargesCents: 41230, dueDate: null, paidCents: null, charges: [] },
      ],
    },
    notificationGroup: { findMany: async () => NOTIFICATION_GROUP_ROWS },
  });
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-03T10:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/notifications/plan", () => {
  it("returns the plan, parsing with the shared schema", async () => {
    useHousehold([
      { month: "2026-11", householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } },
    ]);
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const { notifications } = notificationPlanResponseSchema.parse(await response.json());
    expect(notifications.map((n) => n.id)).toEqual(
      expect.arrayContaining(["check:util-sam", "pay-bill:2026-11", "upload:2026-12-02"]),
    );
    expect(notifications.find((n) => n.id === "check:util-sam")?.title).toBe(
      "Did Priya pay Nov utilities for Sam ($82.46)?",
    );
  });

  it("answers an empty plan before First run, parsing with the shared schema", async () => {
    useHousehold([]);
    const response = await GET(request(), undefined);
    expect(notificationPlanResponseSchema.parse(await response.json())).toEqual({ notifications: [] });
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await GET(request(), undefined)).status).toBe(401);
  });
});
