import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  HOUSEHOLD_SCHEMA_VERSION,
  apiErrorBodySchema,
  setupFinishResponseSchema,
  setupResponseSchema,
  setupSaveResponseSchema,
  setupStartMonthResponseSchema,
  type HouseholdConfig,
  type MessageTemplates,
} from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { prisma } from "@/lib/prisma";
import { POST as FINISH } from "./finish/route";
import { GET } from "./route";
import { GET as GET_START, POST as SAVE_START } from "./start-month/route";
import { POST as MARK } from "./steps/[id]/route";

/** The first version after Rent & rooms: the owner alone. */
const OWNER_ONLY: HouseholdConfig = {
  rooms: [{ id: ROOM_IDS.master, roomType: "MASTER", name: "Master room", airconUnits: 1 }],
  people: [{ personId: PERSON_IDS.alex, role: "OWNER", roomId: ROOM_IDS.master, utilityShares: 0, routes: {}, dueDays: {}, depositCents: 0 }],
  categories: {
    rent: { landlordRentCents: 300000, landlordDueDay: 1, ownerBps: 10000, primaryBps: 0 },
    utilities: { totalShares: 1000, ownerBps: 10000, primaryBps: 0 },
    aircon: { ownerBps: 10000, primaryBps: 0 },
  },
  recurring: [],
};

const REQUIRED = ["startMonth", "rentAndRooms", "people", "householdSplits"];

interface State {
  months: { month: string; householdVersionId: string }[];
  versions: { id: string; startsFromMonth: string; schemaVersion: number; config: unknown; locked: boolean }[];
  setup: { startMonth: string | null; doneSteps: string[] } | null;
  charges: { month: string }[];
}

let state: State;

/** An in-memory database holding First run's state: the months, the versions, the `Setup` row and the charges. */
function useDb(
  { config = NOV_2026_CONFIG, setup = null, months = [], templates = null }: {
    config?: HouseholdConfig | null;
    setup?: State["setup"];
    months?: string[];
    templates?: MessageTemplates | null;
  } = {},
) {
  state = {
    months: months.map((month) => ({ month, householdVersionId: "v1" })),
    versions: config ? [{ id: "v1", startsFromMonth: "2026-11", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config, locked: false }] : [],
    setup,
    charges: [],
  };
  const db = {
    month: {
      findFirst: async () => [...state.months].sort((a, b) => b.month.localeCompare(a.month))[0] ?? null,
      findUnique: async ({ where }: { where: { month: string } }) => state.months.find((m) => m.month === where.month) ?? null,
      create: async ({ data }: { data: State["months"][number] }) => {
        state.months.push(data);
        state.versions = state.versions.map((v) => (v.id === data.householdVersionId ? { ...v, locked: true } : v));
        return data;
      },
    },
    setup: {
      findUnique: async () => state.setup,
      upsert: async ({ update }: { update: { startMonth?: string; doneSteps: string[] } }) => {
        state.setup = { startMonth: update.startMonth ?? state.setup?.startMonth ?? null, doneSteps: update.doneSteps };
        return state.setup;
      },
    },
    householdVersion: {
      findMany: async () => state.versions,
      updateMany: async ({ data }: { data: { startsFromMonth: string } }) => {
        const open = state.versions.filter((v) => !v.locked);
        state.versions = state.versions.map((v) => (v.locked ? v : { ...v, ...data }));
        return { count: open.length };
      },
      findFirst: async ({ where }: { where: { startsFromMonth: { lte: string } } }) =>
        state.versions
          .filter((v) => v.startsFromMonth <= where.startsFromMonth.lte)
          .sort((a, b) => b.startsFromMonth.localeCompare(a.startsFromMonth))[0] ?? null,
    },
    messageTemplates: { findUnique: async () => (templates ? { templates } : null) },
    charge: {
      createMany: async ({ data }: { data: { month: string }[] }) => {
        state.charges.push(...data);
      },
    },
  };
  Object.assign(prisma, { ...db, $transaction: (fn: (tx: typeof db) => Promise<unknown>) => fn(db) });
}

const get = (path: string) => new Request(`http://localhost/api/setup${path}`);
const post = (path: string, body?: unknown) =>
  new Request(`http://localhost/api/setup${path}`, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const step = (id: string) => ({ params: Promise.resolve({ id }) });

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(code);
}

beforeEach(() => vi.stubEnv("DEV_NOW", "2026-11-07T09:00:00+08:00"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/setup", () => {
  it("returns Welcome on a fresh database, parsing with the shared schema", async () => {
    useDb({ config: null });
    const response = await GET(get(""), undefined);
    expect(response.status).toBe(200);
    const body = setupResponseSchema.parse(await response.json());
    expect(body.heading).toBe("Set up your household");
    expect(body.rows.map((r) => r.state)).toEqual(["current", "disabled", "disabled", "disabled", "disabled"]);
  });

  it("follows the recorded steps", async () => {
    useDb({ setup: { startMonth: "2026-11", doneSteps: REQUIRED } });
    const body = setupResponseSchema.parse(await (await GET(get(""), undefined)).json());
    expect(body.heading).toBe("Your household is set up");
    expect(body.secondary).toEqual({ label: "Not now", target: { kind: "finish" } });
  });

  it("answers 409 setup_done once a month is open", async () => {
    useDb({ months: ["2026-11"] });
    await expectError(await GET(get(""), undefined), 409, "setup_done");
  });

  it("answers 401 without a session", async () => {
    useDb();
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await GET(get(""), undefined)).status).toBe(401);
  });
});

describe("GET /api/setup/start-month", () => {
  it("returns the three cards from today, parsing with the shared schema", async () => {
    useDb({ config: null });
    const response = await GET_START(get("/start-month"), undefined);
    expect(response.status).toBe(200);
    const body = setupStartMonthResponseSchema.parse(await response.json());
    expect(body.options.map((o) => o.title)).toEqual(["November 2026", "December 2026", "Choose from the calendar"]);
    expect(body.options[0].note).toBe("Due dates before today start as overdue");
    expect(body.selected).toBe("this");
    expect(body.pickerFrom).toBe("2027-01");
    expect(body.startMonth).toBeNull();
  });

  it("selects the saved month's card", async () => {
    useDb({ setup: { startMonth: "2027-03", doneSteps: ["startMonth"] } });
    const body = setupStartMonthResponseSchema.parse(await (await GET_START(get("/start-month"), undefined)).json());
    expect(body.selected).toBe("other");
    expect(body.options[2].title).toBe("March 2027");
  });

  it("answers 409 setup_done once a month is open", async () => {
    useDb({ months: ["2026-11"] });
    await expectError(await GET_START(get("/start-month"), undefined), 409, "setup_done");
  });
});

describe("POST /api/setup/start-month", () => {
  it("saves the month and marks Start month done, on a fresh database", async () => {
    useDb({ config: null });
    const response = await SAVE_START(post("/start-month", { month: "2026-12" }), undefined);
    expect(response.status).toBe(200);
    expect(setupSaveResponseSchema.parse(await response.json())).toEqual({ doneSteps: ["startMonth"] });
    expect(state.setup).toEqual({ startMonth: "2026-12", doneSteps: ["startMonth"] });
  });

  it("moves the first version's start once Rent & rooms is saved, keeping the other steps", async () => {
    useDb({ setup: { startMonth: "2026-11", doneSteps: ["startMonth", "rentAndRooms"] } });
    await SAVE_START(post("/start-month", { month: "2027-02" }), undefined);
    expect(state.versions[0].startsFromMonth).toBe("2027-02");
    expect(state.setup).toEqual({ startMonth: "2027-02", doneSteps: ["startMonth", "rentAndRooms"] });
  });

  it("accepts the current month", async () => {
    useDb({ config: null });
    expect((await SAVE_START(post("/start-month", { month: "2026-11" }), undefined)).status).toBe(200);
  });

  it("answers 422 invalid_month for a month before the current one", async () => {
    useDb({ config: null });
    await expectError(await SAVE_START(post("/start-month", { month: "2026-10" }), undefined), 422, "invalid_month");
    expect(state.setup).toBeNull();
  });

  it("answers 400 for a malformed month", async () => {
    useDb({ config: null });
    await expectError(await SAVE_START(post("/start-month", { month: "2026-13" }), undefined), 400, "invalid_request");
  });

  it("answers 409 setup_done once a month is open", async () => {
    useDb({ months: ["2026-11"] });
    await expectError(await SAVE_START(post("/start-month", { month: "2026-12" }), undefined), 409, "setup_done");
  });
});

describe("POST /api/setup/steps/:id", () => {
  it("marks People done once someone besides the owner is in the household", async () => {
    useDb({ setup: { startMonth: null, doneSteps: ["startMonth", "rentAndRooms"] } });
    const response = await MARK(post("/steps/people"), step("people"));
    expect(response.status).toBe(200);
    expect(setupSaveResponseSchema.parse(await response.json()).doneSteps).toEqual(["startMonth", "rentAndRooms", "people"]);
  });

  it("answers 409 no_people while only the owner is in the household", async () => {
    useDb({ config: OWNER_ONLY, setup: { startMonth: null, doneSteps: ["startMonth", "rentAndRooms"] } });
    await expectError(await MARK(post("/steps/people"), step("people")), 409, "no_people");
  });

  it("answers 409 rooms_first for People before Rent & rooms", async () => {
    useDb({ config: null, setup: { startMonth: null, doneSteps: ["startMonth"] } });
    await expectError(await MARK(post("/steps/people"), step("people")), 409, "rooms_first");
  });

  it("marks Custom messages done once the required steps are and someone has a custom template", async () => {
    const templates = { ...DEFAULT_MESSAGE_TEMPLATES, overrides: [{ personId: PERSON_IDS.jordan, kind: "MONTHLY" as const, text: "Hi" }] };
    useDb({ setup: { startMonth: null, doneSteps: REQUIRED }, templates });
    const body = setupSaveResponseSchema.parse(await (await MARK(post("/steps/messages"), step("messages"))).json());
    expect(body.doneSteps).toEqual([...REQUIRED, "messages"]);
  });

  it("answers 409 no_templates for Custom messages while nobody has a custom template", async () => {
    useDb({ setup: { startMonth: null, doneSteps: REQUIRED } });
    await expectError(await MARK(post("/steps/messages"), step("messages")), 409, "no_templates");
  });

  it("answers 409 splits_first for Custom messages before Household splits", async () => {
    useDb({ setup: { startMonth: null, doneSteps: ["startMonth", "rentAndRooms", "people"] } });
    await expectError(await MARK(post("/steps/messages"), step("messages")), 409, "splits_first");
  });

  it("answers 400 for a step its own save marks", async () => {
    useDb();
    await expectError(await MARK(post("/steps/rentAndRooms"), step("rentAndRooms")), 400, "invalid_request");
  });

  it("answers 409 setup_done once a month is open", async () => {
    useDb({ months: ["2026-11"] });
    await expectError(await MARK(post("/steps/people"), step("people")), 409, "setup_done");
  });
});

describe("POST /api/setup/finish", () => {
  it("opens the start month, parsing with the shared schema", async () => {
    useDb({ setup: { startMonth: "2026-11", doneSteps: REQUIRED } });
    const response = await FINISH(post("/finish"), undefined);
    expect(response.status).toBe(200);
    expect(setupFinishResponseSchema.parse(await response.json())).toEqual({ month: "2026-11" });
    expect(state.months.map((m) => m.month)).toEqual(["2026-11"]);
    expect(state.charges.length).toBeGreaterThan(0);
    expect(state.charges.every((c) => c.month === "2026-11")).toBe(true);
  });

  it("opens a future start month early, moving the version there", async () => {
    useDb({ setup: { startMonth: "2027-01", doneSteps: [...REQUIRED, "messages"] } });
    const body = setupFinishResponseSchema.parse(await (await FINISH(post("/finish"), undefined)).json());
    expect(body).toEqual({ month: "2027-01" });
    expect(state.versions[0].startsFromMonth).toBe("2027-01");
    expect(state.months.map((m) => m.month)).toEqual(["2027-01"]);
  });

  it("opens the current month when the saved start month has passed", async () => {
    vi.stubEnv("DEV_NOW", "2026-12-02T09:00:00+08:00");
    useDb({ setup: { startMonth: "2026-11", doneSteps: REQUIRED } });
    const body = setupFinishResponseSchema.parse(await (await FINISH(post("/finish"), undefined)).json());
    expect(body.month).toBe("2026-12");
    expect(state.versions[0].startsFromMonth).toBe("2026-12");
  });

  it("answers 409 steps_incomplete until the required steps are done, and opens nothing", async () => {
    useDb({ setup: { startMonth: "2026-11", doneSteps: ["startMonth", "rentAndRooms", "people"] } });
    await expectError(await FINISH(post("/finish"), undefined), 409, "steps_incomplete");
    expect(state.months).toEqual([]);
  });

  it("answers 409 setup_done once a month is open, so a second tap opens nothing more", async () => {
    useDb({ setup: { startMonth: "2026-11", doneSteps: REQUIRED } });
    await FINISH(post("/finish"), undefined);
    await expectError(await FINISH(post("/finish"), undefined), 409, "setup_done");
    expect(state.months).toHaveLength(1);
  });
});
