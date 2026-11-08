import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  HOUSEHOLD_SCHEMA_VERSION,
  apiErrorBodySchema,
  setupMessagesResponseSchema,
  setupSaveResponseSchema,
  type MessageTemplates,
} from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { prisma } from "@/lib/prisma";
import { POST as DISCARD } from "./discard/route";
import { GET } from "./route";

const REQUIRED = ["startMonth", "rentAndRooms", "people", "householdSplits"];

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: null, color: "BLUE", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: null, color: "ORANGE", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: null, color: "GREEN", isOwner: false },
];

const CUSTOM: MessageTemplates = {
  ...DEFAULT_MESSAGE_TEMPLATES,
  overrides: [
    { personId: PERSON_IDS.jordan, kind: "MONTHLY", text: "Hi {name}! {lines}" },
    { personId: PERSON_IDS.sam, kind: "NUDGE", text: "Hey {name}, {charge}" },
  ],
  lineLabels: { UTILITIES: "Power and water" },
  sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.priya]: "Room share" } },
};

let state: { templates: MessageTemplates | null; doneSteps: string[] };

/** Points the mocked Prisma client at First run with the Nov 2026 household, the given wording and done steps. */
function useFirstRun({
  templates = null,
  doneSteps = [...REQUIRED, "messages"],
  opened = null,
}: { templates?: MessageTemplates | null; doneSteps?: string[]; opened?: string | null } = {}) {
  state = { templates, doneSteps };
  const db = {
    month: { findFirst: async () => (opened ? { month: opened } : null), findUnique: async () => null },
    householdVersion: {
      findMany: async () => [{ startsFromMonth: "2026-12", schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG }],
    },
    setup: {
      findUnique: async () => ({ startMonth: "2026-12", doneSteps: state.doneSteps }),
      upsert: async ({ update }: { update: { doneSteps: string[] } }) => {
        state.doneSteps = update.doneSteps;
        return { startMonth: "2026-12", doneSteps: state.doneSteps };
      },
    },
    person: { findMany: async () => PEOPLE },
    messageTemplates: {
      findUnique: async () => (state.templates ? { templates: state.templates } : null),
      upsert: async ({ update }: { update: { templates: MessageTemplates } }) => {
        state.templates = update.templates;
      },
    },
  };
  Object.assign(prisma, { ...db, $transaction: (fn: (tx: typeof db) => Promise<unknown>) => fn(db) });
}

const get = () => new Request("http://localhost/api/setup/messages");
const discard = () => new Request("http://localhost/api/setup/messages/discard", { method: "POST" });

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe(code);
}

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-09T09:00:00+08:00");
  useFirstRun();
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/setup/messages", () => {
  it("returns the page with no custom template, parsing with the shared schema", async () => {
    const response = await GET(get(), undefined);
    expect(response.status).toBe(200);
    const body = setupMessagesResponseSchema.parse(await response.json());
    expect(body.rows.map((r) => [r.kind, r.detail, r.tone])).toEqual([
      ["MONTHLY", "Same for everyone", "muted"],
      ["NUDGE", "Same for everyone", "muted"],
    ]);
    expect(body.save.enabled).toBe(false);
    expect(body.skip.confirm).toBeNull();
  });

  it("counts the custom templates, enables Save and gives the skipMessages dialog", async () => {
    useFirstRun({ templates: CUSTOM });
    const body = setupMessagesResponseSchema.parse(await (await GET(get(), undefined)).json());
    expect(body.rows.map((r) => [r.detail, r.tone])).toEqual([
      ["Custom templates: 1", "success"],
      ["Custom templates: 1", "success"],
    ]);
    expect(body.save.enabled).toBe(true);
    expect(body.skip.confirm?.confirmLabel).toBe("Discard templates");
  });

  it("answers 409 splits_first before Household splits is done", async () => {
    useFirstRun({ doneSteps: ["startMonth", "rentAndRooms", "people"] });
    await expectError(await GET(get(), undefined), 409, "splits_first");
  });

  it("answers 409 setup_done once a month is open", async () => {
    useFirstRun({ opened: "2026-12" });
    await expectError(await GET(get(), undefined), 409, "setup_done");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in first."));
    await expectError(await GET(get(), undefined), 401, "unauthorized");
  });
});

describe("POST /api/setup/messages/discard", () => {
  it("removes every custom template and section title, keeps the Defaults and line labels, and un-marks the step", async () => {
    useFirstRun({ templates: CUSTOM });
    const response = await DISCARD(discard(), undefined);
    expect(response.status).toBe(200);
    expect(setupSaveResponseSchema.parse(await response.json()).doneSteps).toEqual(REQUIRED);
    expect(state.templates).toEqual({ ...CUSTOM, overrides: [], sectionTitles: {} });
    const page = setupMessagesResponseSchema.parse(await (await GET(get(), undefined)).json());
    expect(page.save.enabled).toBe(false);
  });

  it("is harmless with no custom template", async () => {
    useFirstRun({ doneSteps: REQUIRED });
    const body = setupSaveResponseSchema.parse(await (await DISCARD(discard(), undefined)).json());
    expect(body.doneSteps).toEqual(REQUIRED);
    expect(state.templates).toMatchObject({ overrides: [], sectionTitles: {} });
  });

  it("answers 409 splits_first before Household splits is done", async () => {
    useFirstRun({ templates: CUSTOM, doneSteps: ["startMonth", "rentAndRooms", "people"] });
    await expectError(await DISCARD(discard(), undefined), 409, "splits_first");
    expect(state.templates).toEqual(CUSTOM);
  });

  it("answers 409 setup_done once a month is open", async () => {
    useFirstRun({ templates: CUSTOM, opened: "2026-12" });
    await expectError(await DISCARD(discard(), undefined), 409, "setup_done");
  });
});
