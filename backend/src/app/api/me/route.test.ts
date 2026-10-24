import { meResponseSchema } from "@splithouse/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "tenant@example.com" } }),
}));

import { GET } from "./route";

describe("GET /api/me", () => {
  it("matches the shared response schema the app reads", async () => {
    const response = await GET(new Request("http://localhost/api/me"), undefined);
    expect(response.status).toBe(200);
    expect(meResponseSchema.safeParse(await response.json()).success).toBe(true);
  });
});
