import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, settingsResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import type { StoredNotificationGroup } from "@/lib/notifications/groups";
import { NOTIFICATION_GROUP_ROWS } from "@/lib/notifications/rows";
import { prisma } from "@/lib/prisma";
import { PUT } from "./route";

/** Points the mocked Prisma client at the Nov 2026 household with the seeded switches, which saves write into. */
function useHousehold() {
  const stored: StoredNotificationGroup[] = NOTIFICATION_GROUP_ROWS.map((g) => ({ ...g }));
  Object.assign(prisma, {
    messageTemplates: { findUnique: async () => null },
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: {
      findMany: async () => [
        { startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
      ],
    },
    notificationGroup: {
      findMany: async () => stored,
      upsert: async (args: { where: { key: string }; update: { enabled: boolean } }) => {
        Object.assign(stored.find((g) => g.key === args.where.key) ?? {}, args.update);
        return {};
      },
    },
  });
}

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/settings/notifications", { method: "PUT", body: JSON.stringify(body) }),
    undefined,
  );

describe("PUT /api/settings/notifications", () => {
  it("saves one switch, answering with the Settings screen that parses with the shared schema", async () => {
    useHousehold();
    const response = await put({ group: "fyi", on: true });
    expect(response.status).toBe(200);
    const body = settingsResponseSchema.parse(await response.json());
    expect(body.notifications.find((n) => n.group === "fyi")?.on).toBe(true);
  });

  it("answers 400 invalid_request for a retired or unknown switch", async () => {
    useHousehold();
    for (const group of ["collectRent", "paymentChecks", "savings"]) {
      const response = await put({ group, on: true });
      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe("invalid_request");
    }
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await put({ group: "fyi", on: true })).status).toBe(401);
  });
});
