import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { deleteCorrectionResponseSchema } from "@splithouse/shared";
import { fakeEventTables } from "@/lib/fixtures/notification-events";
import { prisma } from "@/lib/prisma";
import { DELETE } from "./route";

interface Row {
  id: string;
  month: string;
  category: "UTILITIES" | "CORRECTION";
  correctsMonth: string | null;
}

/** Points the mocked Prisma client at a refund, the utilities charge it fixes, and nothing else. */
function useCharges() {
  const rows: Row[] = [
    { id: "oct-utilities-jordan", month: "2026-10", category: "UTILITIES", correctsMonth: null },
    { id: "nov-refund-jordan", month: "2026-11", category: "CORRECTION", correctsMonth: "2026-10" },
  ];
  Object.assign(prisma, {
    ...fakeEventTables().tables,
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
    charge: {
      findUnique: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
      delete: async ({ where }: { where: { id: string } }) => {
        rows.splice(rows.findIndex((r) => r.id === where.id), 1);
        return { id: where.id };
      },
    },
  });
  return rows;
}

const remove = (id: string) =>
  DELETE(new Request(`http://localhost/api/charges/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });

async function errorOf(response: Response) {
  return { status: response.status, code: ((await response.json()) as { error: { code: string } }).error.code };
}

describe("DELETE /api/charges/:id", () => {
  it("deletes a correction, answering with a response that parses with the shared schema", async () => {
    const rows = useCharges();
    const response = await remove("nov-refund-jordan");
    expect(response.status).toBe(200);
    expect(deleteCorrectionResponseSchema.parse(await response.json())).toEqual({
      chargeId: "nov-refund-jordan",
      month: "2026-11",
      correctsMonth: "2026-10",
    });
    expect(rows.map((r) => r.id)).toEqual(["oct-utilities-jordan"]);
  });

  it("answers 409 not_correction for any other charge, deleting nothing", async () => {
    const rows = useCharges();
    expect(await errorOf(await remove("oct-utilities-jordan"))).toEqual({ status: 409, code: "not_correction" });
    expect(rows).toHaveLength(2);
  });

  it("answers 404 no_charge for an unknown charge, or one already deleted", async () => {
    useCharges();
    await remove("nov-refund-jordan");
    expect(await errorOf(await remove("nov-refund-jordan"))).toEqual({ status: 404, code: "no_charge" });
    expect(await errorOf(await remove("nope"))).toEqual({ status: 404, code: "no_charge" });
  });
});
