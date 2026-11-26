import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeEventTables } from "@/lib/fixtures/notification-events";
import { deleteCorrection, type DeleteCorrectionDb } from "./delete-correction.service";

/** November with its bill paid and everything paid but one unpaid extra charge correcting October. */
function fakeDb({ fyi = true } = {}) {
  const events = fakeEventTables({ fyi });
  const rows = [
    { id: "nov-extra-jordan", month: "2026-11", category: "CORRECTION" as const, correctsMonth: "2026-10", paidCents: null },
  ];
  const db: DeleteCorrectionDb = {
    $transaction: (fn) =>
      fn({
        ...events.tables,
        bill: { findMany: async () => [{ month: "2026-11", paidCents: 41230 }] },
        charge: {
          findUnique: async ({ where }) => rows.find((r) => r.id === where.id) ?? null,
          delete: async ({ where }) => {
            rows.splice(rows.findIndex((r) => r.id === where.id), 1);
            return { id: where.id };
          },
          count: async () => rows.filter((r) => r.paidCents === null).length,
        },
      }),
  };
  return { db, events: events.stored };
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-20T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("deleteCorrection", () => {
  it("records the settled FYI when deleting the last unpaid charge settles the month", async () => {
    const { db, events } = fakeDb();
    expect(await deleteCorrection(db, "nov-extra-jordan")).toEqual({
      chargeId: "nov-extra-jordan",
      month: "2026-11",
      correctsMonth: "2026-10",
    });
    expect(events.map((e) => e.key)).toEqual(["settled:2026-11:2026-11-20"]);
  });

  it("records nothing with FYI updates off", async () => {
    const { db, events } = fakeDb({ fyi: false });
    await deleteCorrection(db, "nov-extra-jordan");
    expect(events).toEqual([]);
  });
});
