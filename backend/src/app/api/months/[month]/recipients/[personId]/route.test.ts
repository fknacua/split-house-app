import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { HOUSEHOLD_SCHEMA_VERSION, recipientResponseSchema } from "@splithouse/shared";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const params = (month: string, personId: string) => ({ params: Promise.resolve({ month, personId }) });

/** Points the mocked Prisma client at November, open or not, with Priya's and Sam's routed charges. */
function useNovember(open: boolean) {
  const charge = (personId: string, category: string, label: string, amountCents: number, payVia: string | null) => ({
    id: `${personId}-${category}`,
    personId,
    month: "2026-11",
    category,
    label,
    amountCents,
    dueDate: payVia ? null : new Date("2026-11-07T00:00:00+08:00"),
    payViaPersonId: payVia,
    paidCents: null,
  });
  Object.assign(prisma, {
    month: {
      findUnique: async () =>
        open ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    person: {
      findMany: async () => [
        { id: PERSON_IDS.alex, name: "Alex", isOwner: true, whatsappE164: null },
        { id: PERSON_IDS.priya, name: "Priya", isOwner: false, whatsappE164: "+6580000000" },
        { id: PERSON_IDS.sam, name: "Sam", isOwner: false, whatsappE164: "+6580000000" },
      ],
    },
    bill: { findUnique: async () => ({ currentChargesCents: 41230 }) },
    charge: {
      findMany: async () => [
        charge(PERSON_IDS.priya, "RENT", "Rent", 167500, null),
        charge(PERSON_IDS.sam, "UTILITIES", "Utilities", 8246, PERSON_IDS.priya),
      ],
    },
    messageEvent: { findMany: async () => [] },
  });
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-01T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/months/:month/recipients/:personId", () => {
  it("returns the Recipient screen, parsing with the shared schema", async () => {
    useNovember(true);
    const response = await GET(new Request("http://localhost"), params("2026-11", PERSON_IDS.priya));
    expect(response.status).toBe(200);
    const recipient = recipientResponseSchema.parse(await response.json());
    expect(recipient).toMatchObject({
      header: { name: "Priya", sub: "Master room · pays you directly" },
      amountCard: { amount: "$1,757.46", statusLine: { text: "Due 7 Nov · includes Sam’s share" } },
      primaryAction: { label: "Send on WhatsApp", enabled: true },
    });
  });

  it("chooses the overdue charge named by ?chargeId", async () => {
    useNovember(true);
    vi.stubEnv("DEV_NOW", "2026-11-08T09:00:00+08:00");
    Object.assign(prisma, {
      messageEvent: {
        findMany: async () => [{ kind: "MONTHLY", chargeId: null, openedAt: new Date("2026-11-02T10:00:00+08:00") }],
      },
    });
    const samUtilities = `${PERSON_IDS.sam}-UTILITIES`;
    const response = await GET(
      new Request(`http://localhost?chargeId=${samUtilities}`),
      params("2026-11", PERSON_IDS.priya),
    );
    expect(response.status).toBe(200);
    const recipient = recipientResponseSchema.parse(await response.json());
    expect(recipient.amountCard.statusLine?.text).toBe("Utilities · Sam overdue since 7 Nov");
    expect(recipient.primaryAction?.target).toMatchObject({ kind: "record-payment", chargeId: samUtilities });
    expect(recipient.secondaryActions[0].target).toMatchObject({ kind: "nudge-whatsapp", chargeId: samUtilities });
  });

  it("returns 400 for a month that is not YYYY-MM", async () => {
    useNovember(true);
    const response = await GET(new Request("http://localhost"), params("Nov", PERSON_IDS.priya));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("returns 404 no_month for a month that is not open", async () => {
    useNovember(false);
    const response = await GET(new Request("http://localhost"), params("2026-12", PERSON_IDS.priya));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("no_month");
  });

  it("returns 404 no_person for the owner or an unknown person", async () => {
    useNovember(true);
    for (const personId of [PERSON_IDS.alex, "person-nobody"]) {
      const response = await GET(new Request("http://localhost"), params("2026-11", personId));
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("no_person");
    }
  });
});
