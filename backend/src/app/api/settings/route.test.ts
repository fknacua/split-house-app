import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, settingsResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { NOTIFICATION_GROUP_ROWS } from "@/lib/notifications/rows";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const request = () => new Request("http://localhost/api/settings");

/** Points the mocked Prisma client at a household with the given versions. */
function useHousehold(versions: { startsFromMonth: string; schemaVersion: number; config: unknown }[]) {
  Object.assign(prisma, {
    messageTemplates: { findUnique: async () => null },
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: { findMany: async () => versions },
    notificationGroup: { findMany: async () => NOTIFICATION_GROUP_ROWS },
  });
}

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  useHousehold([{ startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG }]);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/settings", () => {
  it("returns the signed-in email, the Messages rows and the switches, parsing with the shared schema", async () => {
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    const body = settingsResponseSchema.parse(await response.json());
    expect(body.email).toBe("owner@example.com");
    expect(body.messages.map((m) => m.kind)).toEqual(["MONTHLY", "NUDGE"]);
    expect(body.notifications.map((n) => n.group)).toEqual(["uploadBill", "collectPayments", "payBill", "fyi"]);
  });

  it("answers before first run, parsing with the shared schema", async () => {
    useHousehold([]);
    const response = await GET(request(), undefined);
    expect(response.status).toBe(200);
    expect(settingsResponseSchema.safeParse(await response.json()).success).toBe(true);
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await GET(request(), undefined)).status).toBe(401);
  });
});
