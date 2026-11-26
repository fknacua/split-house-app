import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { notificationAcknowledgeResponseSchema } from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

/** Points the mocked Prisma client at one pending settled event. */
function useEvents() {
  const rows = [{ key: "settled:2026-11:2026-11-29", status: "PENDING", fireAt: null as Date | null }];
  Object.assign(prisma, {
    notificationEvent: {
      updateMany: async ({ where, data }: { where: { key: string; status: string }; data: object }) => {
        const hit = rows.filter((r) => r.key === where.key && r.status === where.status);
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      findMany: async ({ where }: { where: { key: { in: string[] }; status: string } }) =>
        rows.filter((r) => where.key.in.includes(r.key) && r.status === where.status).map((r) => ({ key: r.key })),
    },
  });
  return rows;
}

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/notifications/acknowledge", { method: "POST", body: JSON.stringify(body) }), undefined);

describe("POST /api/notifications/acknowledge", () => {
  it("schedules the event at the phone's time, answering with a response that parses with the shared schema", async () => {
    const rows = useEvents();
    const response = await post({ events: [{ id: "settled:2026-11:2026-11-29", at: "2026-11-29T14:03:05+08:00" }] });
    expect(response.status).toBe(200);
    expect(notificationAcknowledgeResponseSchema.parse(await response.json())).toEqual({
      acknowledged: ["settled:2026-11:2026-11-29"],
    });
    expect(rows[0]).toEqual({
      key: "settled:2026-11:2026-11-29",
      status: "SCHEDULED",
      fireAt: new Date("2026-11-29T14:03:05+08:00"),
    });
  });

  it("answers 400 for a time that isn't an ISO date and time", async () => {
    useEvents();
    const response = await post({ events: [{ id: "settled:2026-11:2026-11-29", at: "soon" }] });
    expect(response.status).toBe(400);
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await post({ events: [] })).status).toBe(401);
  });
});
