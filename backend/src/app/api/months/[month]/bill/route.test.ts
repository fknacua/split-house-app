import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST as saveBill } from "./route";
import { GET as getDraft, POST as uploadDraft } from "../bill-draft/route";

const params = (month: string) => ({ params: Promise.resolve({ month }) });

describe("POST /api/months/:month/bill", () => {
  it("returns 400 for a bad month", async () => {
    const response = await saveBill(new Request("http://localhost", { method: "POST", body: "{}" }), params("2026-13"));
    expect(response.status).toBe(400);
  });

  const filled = {
    currentChargesCents: 41230,
    billMonth: "2026-11",
    dueDate: null,
    billingPeriodStart: "2026-10-03",
    billingPeriodEnd: "2026-11-02",
    lines: [],
  };

  it.each([
    ["Current Charges is not above zero", { currentChargesCents: 0 }],
    ["the bill month is missing", { billMonth: null }],
    ["the billing period start is missing", { billingPeriodStart: null }],
    ["the billing period end is missing", { billingPeriodEnd: null }],
  ])("returns 400 when %s", async (_name, change) => {
    const body = JSON.stringify({ ...filled, ...change });
    const response = await saveBill(new Request("http://localhost", { method: "POST", body }), params("2026-11"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });
});

describe("/api/months/:month/bill-draft", () => {
  it("POST returns 400 without a multipart file", async () => {
    const response = await uploadDraft(new Request("http://localhost", { method: "POST", body: "{}" }), params("2026-11"));
    expect(response.status).toBe(400);
  });

  it("POST returns 400 when the form has no file", async () => {
    const form = new FormData();
    form.append("file", "not a file");
    const response = await uploadDraft(new Request("http://localhost", { method: "POST", body: form }), params("2026-11"));
    expect(response.status).toBe(400);
  });

  it("GET returns 400 for a bad month", async () => {
    const response = await getDraft(new Request("http://localhost"), params("Nov"));
    expect(response.status).toBe(400);
  });
});
