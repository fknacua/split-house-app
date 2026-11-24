import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, settingsResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { PUT } from "./route";

/** Points the mocked Prisma client at the Nov 2026 household with no `Settings` row yet. */
function useHousehold() {
  let stored: unknown = null;
  Object.assign(prisma, {
    messageTemplates: { findUnique: async () => null },
    month: { findFirst: async () => ({ month: "2026-11" }) },
    householdVersion: {
      findMany: async () => [
        { startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG },
      ],
    },
    settings: {
      findUnique: async () => (stored === null ? null : { notifications: stored }),
      upsert: async (args: { create: { notifications: unknown } }) => {
        stored = args.create.notifications;
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
  it("saves one toggle, answering with the Settings screen that parses with the shared schema", async () => {
    useHousehold();
    const response = await put({ toggle: "fyi", on: true });
    expect(response.status).toBe(200);
    const body = settingsResponseSchema.parse(await response.json());
    expect(body.notifications.find((n) => n.toggle === "fyi")?.on).toBe(true);
  });

  it("answers 400 invalid_request for an unknown toggle", async () => {
    useHousehold();
    const response = await put({ toggle: "savings", on: true });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("invalid_request");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await put({ toggle: "fyi", on: true })).status).toBe(401);
  });
});
