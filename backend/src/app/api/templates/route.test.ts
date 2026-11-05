import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  HOUSEHOLD_SCHEMA_VERSION,
  templateFormResponseSchema,
  templatePreviewResponseSchema,
  templateSaveResponseSchema,
  type HouseholdConfig,
  type MessageTemplates,
} from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { prisma } from "@/lib/prisma";
import { GET } from "./[kind]/route";
import { POST as PREVIEW } from "./preview/route";
import { POST as SAVE } from "./route";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "teal", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6580000001", color: "pink", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: "+6580000002", color: "green", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6580000003", color: "blue", isOwner: false },
];

const upsert = vi.fn();

/** Points the mocked Prisma client at a household on the given versions and saved wording. */
function useHousehold(
  versions: { startsFromMonth: string; config: HouseholdConfig }[],
  { opened = true, templates = null }: { opened?: boolean; templates?: MessageTemplates | null } = {},
) {
  const rows = versions.map((v) => ({ ...v, schemaVersion: HOUSEHOLD_SCHEMA_VERSION }));
  Object.assign(prisma, {
    month: {
      findFirst: async () => (opened ? { month: "2026-11" } : null),
      findUnique: async () =>
        opened ? { householdVersion: { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, config: NOV_2026_CONFIG } } : null,
    },
    householdVersion: { findMany: async () => rows },
    person: { findMany: async () => PEOPLE },
    messageTemplates: { findUnique: async () => (templates ? { templates } : null), upsert },
  });
}

const getForm = (kind: string, query = "") =>
  GET(new Request(`http://localhost/api/templates/${kind}${query}`), { params: Promise.resolve({ kind }) });

const post = (handler: typeof SAVE, path: string, body: unknown) =>
  handler(new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) }), undefined);
const postPreview = (body: unknown) => post(PREVIEW, "/api/templates/preview", body);
const postSave = (body: unknown) => post(SAVE, "/api/templates", body);

const DRAFT = { template: "MONTHLY", personId: null, text: "Hi {name}!\n\n{lines}\n\n{oops}" };

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  upsert.mockReset();
  useHousehold([{ startsFromMonth: "2026-11", config: NOV_2026_CONFIG }]);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/templates/:kind", () => {
  it.each(["MONTHLY", "NUDGE"])("returns the %s editor, parsing with the shared schema", async (kind) => {
    const response = await getForm(kind);
    expect(response.status).toBe(200);
    expect(templateFormResponseSchema.parse(await response.json()).kind).toBe(kind);
  });

  it("loads a person, parsing with the shared schema", async () => {
    const response = await getForm("MONTHLY", `?personId=${PERSON_IDS.jordan}`);
    expect(templateFormResponseSchema.parse(await response.json()).personId).toBe(PERSON_IDS.jordan);
  });

  it("reads the saved wording, and the defaults before the first save", async () => {
    const defaults = templateFormResponseSchema.parse(await (await getForm("MONTHLY")).json());
    expect(defaults.text).toBe(DEFAULT_MESSAGE_TEMPLATES.monthly);

    useHousehold([{ startsFromMonth: "2026-11", config: NOV_2026_CONFIG }], {
      templates: { ...DEFAULT_MESSAGE_TEMPLATES, monthly: "Saved" },
    });
    expect(templateFormResponseSchema.parse(await (await getForm("MONTHLY")).json()).text).toBe("Saved");
  });

  it("offers someone leaving next month, who still gets this month's messages", async () => {
    const leaving = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.jordan) };
    useHousehold([
      { startsFromMonth: "2026-12", config: leaving },
      { startsFromMonth: "2026-11", config: NOV_2026_CONFIG },
    ]);
    const body = templateFormResponseSchema.parse(await (await getForm("MONTHLY", `?personId=${PERSON_IDS.jordan}`)).json());
    expect(body.appliesTo.options.map((o) => o.label)).toContain("Jordan");
  });

  it.each([
    ["another kind", "OTHER", "", 400, "invalid_request"],
    ["lowercase", "monthly", "", 400, "invalid_request"],
    ["the owner", "MONTHLY", `?personId=${PERSON_IDS.alex}`, 404, "no_person"],
    ["an unknown person", "NUDGE", "?personId=person-unknown", 404, "no_person"],
  ])("refuses %s", async (_name, kind, query, status, code) => {
    const response = await getForm(kind, query);
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
  });

  it("answers 409 before first run", async () => {
    useHousehold([]);
    const response = await getForm("MONTHLY");
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("no_household");
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await getForm("MONTHLY")).status).toBe(401);
  });
});

describe("POST /api/templates/preview", () => {
  it("renders the draft with every line, parsing with the shared schema", async () => {
    const response = await postPreview(DRAFT);
    expect(response.status).toBe(200);
    const body = templatePreviewResponseSchema.parse(await response.json());
    expect(body.meta).toBe("Priya · Nov 2026 sample");
    expect(body.preview.text).toContain("Hi Priya!");
    expect(body.preview.sections[0].lines.map((l) => l.label)).toEqual(["Rent", "Utilities bill", "Aircon servicing", "Starhub"]);
    expect(body.preview.text.endsWith("{oops}")).toBe(true);
    expect(body.canSave).toBe(true);
    expect(body.errors).toEqual({});
  });

  it("uses the draft's line labels and stores nothing", async () => {
    const draft = { ...DRAFT, lineLabels: { UTILITIES: "PUB", AIRCON: "AC Servicing" } };
    const body = templatePreviewResponseSchema.parse(await (await postPreview(draft)).json());
    expect(body.preview.text).toContain("*PUB:* $123.69");
    expect(body.preview.text).toContain("*AC Servicing:* $36.67");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("answers errors with a 200, still rendering", async () => {
    const response = await postPreview({ ...DRAFT, text: " " });
    expect(response.status).toBe(200);
    const body = templatePreviewResponseSchema.parse(await response.json());
    expect(body.errors).toEqual({ text: "Write a message." });
    expect(body.canSave).toBe(false);
  });

  it("still renders when the active month has not opened", async () => {
    useHousehold([{ startsFromMonth: "2026-11", config: NOV_2026_CONFIG }], { opened: false });
    expect(templatePreviewResponseSchema.safeParse(await (await postPreview(DRAFT)).json()).success).toBe(true);
  });

  it.each([
    ["a malformed body", { ...DRAFT, text: null }, 400, "invalid_request"],
    ["the owner", { ...DRAFT, personId: PERSON_IDS.alex }, 404, "no_person"],
  ])("refuses %s", async (_name, body, status, code) => {
    const response = await postPreview(body);
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await postPreview(DRAFT)).status).toBe(401);
  });
});

describe("POST /api/templates", () => {
  it("stores the whole wording, parsing with the shared schema", async () => {
    const response = await postSave({ ...DRAFT, text: "New", lineLabels: { UTILITIES: "PUB" } });
    expect(response.status).toBe(200);
    expect(templateSaveResponseSchema.parse(await response.json())).toEqual({ saved: true });
    const templates = { ...DEFAULT_MESSAGE_TEMPLATES, monthly: "New", lineLabels: { UTILITIES: "PUB" } };
    expect(upsert).toHaveBeenCalledWith({ where: { id: "singleton" }, create: { templates }, update: { templates } });
  });

  it("removes a person's own version", async () => {
    const own = { personId: PERSON_IDS.jordan, kind: "MONTHLY" as const, text: "Own" };
    useHousehold([{ startsFromMonth: "2026-11", config: NOV_2026_CONFIG }], {
      templates: { ...DEFAULT_MESSAGE_TEMPLATES, overrides: [own] },
    });
    expect((await postSave({ template: "MONTHLY", personId: PERSON_IDS.jordan, text: null })).status).toBe(200);
    expect(upsert.mock.calls[0][0].update.templates.overrides).toEqual([]);
  });

  it.each([
    ["a malformed body", { ...DRAFT, template: "OTHER" }, 400, "invalid_request"],
    ["empty text", { ...DRAFT, text: " " }, 422, "invalid_edit"],
    ["an empty label", { ...DRAFT, lineLabels: { RENT: "" } }, 422, "invalid_edit"],
    ["nothing to store", { ...DRAFT, text: DEFAULT_MESSAGE_TEMPLATES.monthly }, 422, "no_changes"],
    ["the owner", { ...DRAFT, personId: PERSON_IDS.alex }, 404, "no_person"],
  ])("refuses %s, storing nothing", async (_name, body, status, code) => {
    const response = await postSave(body);
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));
    expect((await postSave(DRAFT)).status).toBe(401);
  });
});
