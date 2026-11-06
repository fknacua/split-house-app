import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireSession: vi.fn().mockResolvedValue({ user: { email: "owner@example.com" } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  HOUSEHOLD_SCHEMA_VERSION,
  templateEditorResponseSchema,
  templateLandingResponseSchema,
  templatePreviewResponseSchema,
  templateSaveResponseSchema,
  type HouseholdConfig,
  type MessageTemplates,
} from "@splithouse/shared";
import { ApiError, requireSession } from "@/lib/api";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { prisma } from "@/lib/prisma";
import { GET as EDITOR } from "./[kind]/editor/route";
import { POST as RESTORE } from "./[kind]/restore/route";
import { DELETE as REMOVE, GET as LANDING } from "./[kind]/route";
import { POST as LABELS } from "./labels/route";
import { POST as PREVIEW } from "./preview/route";
import { POST as SAVE } from "./route";

const PEOPLE = [
  { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
  { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6580000001", color: "PINK", isOwner: false },
  { id: PERSON_IDS.sam, name: "Sam", whatsappE164: "+6580000002", color: "GREEN", isOwner: false },
  { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6580000003", color: "BLUE", isOwner: false },
];

const JORDANS = { personId: PERSON_IDS.jordan, kind: "MONTHLY" as const, text: "Hi {name}, yours.\n\n{lines}" };
const WITH_JORDAN: MessageTemplates = { ...DEFAULT_MESSAGE_TEMPLATES, overrides: [JORDANS] };

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
    setup: { findUnique: async () => ({ startMonth: null, doneSteps: ["startMonth", "rentAndRooms", "people"] }) },
    person: { findMany: async () => PEOPLE },
    messageTemplates: { findUnique: async () => (templates ? { templates } : null), upsert },
  });
}

const NOV = [{ startsFromMonth: "2026-11", config: NOV_2026_CONFIG }];

const withKind = (kind: string) => ({ params: Promise.resolve({ kind }) });
const getLanding = (kind: string) => LANDING(new Request(`http://localhost/api/templates/${kind}`), withKind(kind));
const getEditor = (kind: string, query = "") =>
  EDITOR(new Request(`http://localhost/api/templates/${kind}/editor${query}`), withKind(kind));
const remove = (kind: string, query = "") =>
  REMOVE(new Request(`http://localhost/api/templates/${kind}${query}`, { method: "DELETE" }), withKind(kind));
const restore = (kind: string) =>
  RESTORE(new Request(`http://localhost/api/templates/${kind}/restore`, { method: "POST" }), withKind(kind));

const post = (handler: typeof SAVE, path: string, body: unknown) =>
  handler(new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) }), undefined);
const postPreview = (body: unknown) => post(PREVIEW, "/api/templates/preview", body);
const postSave = (body: unknown) => post(SAVE, "/api/templates", body);
const postLabels = (body: unknown) => post(LABELS, "/api/templates/labels", body);

const stored = (): MessageTemplates => upsert.mock.calls[0][0].update.templates;

const errorCode = async (response: Response) => (await response.json()).error.code;

const DRAFT = { template: "MONTHLY", personId: null, text: "Hi {name}!\n\n{lines}\n\n{oops}" };

beforeEach(() => {
  vi.stubEnv("DEV_NOW", "2026-11-03T09:00:00+08:00");
  upsert.mockReset();
  useHousehold(NOV);
});
afterEach(() => vi.unstubAllEnvs());

const unauthorized = () =>
  vi.mocked(requireSession).mockRejectedValueOnce(new ApiError(401, "unauthorized", "Sign in required."));

describe("GET /api/templates/:kind", () => {
  it.each(["MONTHLY", "NUDGE"])("returns the %s landing page, parsing with the shared schema", async (kind) => {
    const response = await getLanding(kind);
    expect(response.status).toBe(200);
    const body = templateLandingResponseSchema.parse(await response.json());
    expect(body.kind).toBe(kind);
    expect(body.default.preview?.text).toContain("Hi Priya!");
  });

  it("shows the saved custom templates", async () => {
    useHousehold(NOV, { templates: WITH_JORDAN });
    const body = templateLandingResponseSchema.parse(await (await getLanding("MONTHLY")).json());
    expect(body.custom.cards.map((c) => [c.name, c.sub, c.color])).toEqual([["Jordan", "Tenant · Room 3", "BLUE"]]);
    expect(body.forWho.rows.map((r) => r.label)).toEqual(["Priya · Primary Tenant", "Sam · Tenant"]);
  });

  it("keeps someone leaving next month, who still gets this month's messages", async () => {
    const leaving = { ...NOV_2026_CONFIG, people: NOV_2026_CONFIG.people.filter((p) => p.personId !== PERSON_IDS.jordan) };
    useHousehold([{ startsFromMonth: "2026-12", config: leaving }, ...NOV], { templates: WITH_JORDAN });
    const body = templateLandingResponseSchema.parse(await (await getLanding("MONTHLY")).json());
    expect(body.custom.cards[0].preview.intro).toEqual([{ text: "Hi Jordan, yours.", bold: false }]);
  });

  it.each([
    ["another kind", "OTHER", 400, "invalid_request"],
    ["lowercase", "monthly", 400, "invalid_request"],
  ])("refuses %s", async (_name, kind, status, code) => {
    const response = await getLanding(kind);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
  });

  it("works in First run before Rent & rooms is saved, with nobody to have a custom template", async () => {
    useHousehold([], { opened: false });
    const response = await getLanding("MONTHLY");
    expect(response.status).toBe(200);
    expect(templateLandingResponseSchema.parse(await response.json())).toBeTruthy();
  });

  it("answers 404 no_version when a month is open but no version covers next month", async () => {
    useHousehold([]);
    const response = await getLanding("MONTHLY");
    expect(response.status).toBe(404);
    expect(await errorCode(response)).toBe("no_version");
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await getLanding("MONTHLY")).status).toBe(401);
  });
});

describe("GET /api/templates/:kind/editor", () => {
  it.each(["MONTHLY", "NUDGE"])("returns the %s Default, parsing with the shared schema", async (kind) => {
    const response = await getEditor(kind);
    expect(response.status).toBe(200);
    const body = templateEditorResponseSchema.parse(await response.json());
    expect(body).toMatchObject({ kind, personId: null, title: "Default", restore: null });
  });

  it("reads the saved Default, offering Restore", async () => {
    useHousehold(NOV, { templates: { ...DEFAULT_MESSAGE_TEMPLATES, monthly: "Saved" } });
    const body = templateEditorResponseSchema.parse(await (await getEditor("MONTHLY")).json());
    expect(body.text).toBe("Saved");
    expect(body.restore?.label).toBe("Restore to original");
  });

  it("loads a saved custom template, and a new one from the Default", async () => {
    useHousehold(NOV, { templates: WITH_JORDAN });
    const saved = templateEditorResponseSchema.parse(await (await getEditor("MONTHLY", `?personId=${PERSON_IDS.jordan}`)).json());
    expect(saved).toMatchObject({ title: "Custom template for Jordan", text: JORDANS.text, secondaryAction: { kind: "remove" } });
    const fresh = templateEditorResponseSchema.parse(await (await getEditor("MONTHLY", `?personId=${PERSON_IDS.sam}`)).json());
    expect(fresh).toMatchObject({ title: "Custom template for Sam", text: DEFAULT_MESSAGE_TEMPLATES.monthly });
  });

  it("sends Section labels for someone others pay via, parsing with the shared schema", async () => {
    const body = templateEditorResponseSchema.parse(await (await getEditor("MONTHLY", `?personId=${PERSON_IDS.priya}`)).json());
    expect(body.sectionLabels?.title).toBe("Section labels");
    expect(body.sectionLabels?.rows[0]).toMatchObject({ personId: PERSON_IDS.priya, placeholder: "Yours" });
  });

  it.each([
    ["another kind", "OTHER", "", 400, "invalid_request"],
    ["the owner", "MONTHLY", `?personId=${PERSON_IDS.alex}`, 404, "no_person"],
    ["an unknown person", "NUDGE", "?personId=person-unknown", 404, "no_person"],
  ])("refuses %s", async (_name, kind, query, status, code) => {
    const response = await getEditor(kind, query);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await getEditor("MONTHLY")).status).toBe(401);
  });
});

describe("POST /api/templates/preview", () => {
  it("renders the Default's draft on the primary tenant, parsing with the shared schema", async () => {
    const response = await postPreview(DRAFT);
    expect(response.status).toBe(200);
    const { preview } = templatePreviewResponseSchema.parse(await response.json());
    expect(preview?.text).toContain("Hi Priya!");
    expect(preview?.sections[0].lines.map((l) => l.label)).toEqual(["Rent", "Utilities bill", "Aircon servicing", "Starhub"]);
    expect(preview?.text.endsWith("{oops}")).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("renders a custom template's draft on its person, with the saved labels", async () => {
    useHousehold(NOV, { templates: { ...DEFAULT_MESSAGE_TEMPLATES, lineLabels: { UTILITIES: "PUB" } } });
    const { preview } = templatePreviewResponseSchema.parse(
      await (await postPreview({ ...DRAFT, personId: PERSON_IDS.jordan })).json(),
    );
    expect(preview?.text).toContain("Hi Jordan!");
    expect(preview?.text).toContain("*PUB:* $82.46");
  });

  it("has nothing to preview for blank text", async () => {
    const response = await postPreview({ ...DRAFT, text: " " });
    expect(response.status).toBe(200);
    expect(templatePreviewResponseSchema.parse(await response.json())).toEqual({ preview: null });
  });

  it("still renders when the active month has not opened", async () => {
    useHousehold(NOV, { opened: false });
    expect(templatePreviewResponseSchema.safeParse(await (await postPreview(DRAFT)).json()).success).toBe(true);
  });

  it.each([
    ["a malformed body", { ...DRAFT, text: null }, 400, "invalid_request"],
    ["the owner", { ...DRAFT, personId: PERSON_IDS.alex }, 404, "no_person"],
  ])("refuses %s", async (_name, body, status, code) => {
    const response = await postPreview(body);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await postPreview(DRAFT)).status).toBe(401);
  });
});

describe("POST /api/templates", () => {
  it("stores the Default's text, parsing with the shared schema", async () => {
    const response = await postSave({ ...DRAFT, text: "New" });
    expect(response.status).toBe(200);
    expect(templateSaveResponseSchema.parse(await response.json())).toEqual({ saved: true });
    const templates = { ...DEFAULT_MESSAGE_TEMPLATES, monthly: "New" };
    expect(upsert).toHaveBeenCalledWith({ where: { id: "singleton" }, create: { templates }, update: { templates } });
  });

  it("adds a custom template, even one matching the Default", async () => {
    await postSave({ template: "NUDGE", personId: PERSON_IDS.sam, text: DEFAULT_MESSAGE_TEMPLATES.nudge });
    expect(stored().overrides).toEqual([{ personId: PERSON_IDS.sam, kind: "NUDGE", text: DEFAULT_MESSAGE_TEMPLATES.nudge }]);
  });

  it("answers saved without storing when nothing changes", async () => {
    const response = await postSave({ ...DRAFT, text: DEFAULT_MESSAGE_TEMPLATES.monthly });
    expect(response.status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["a malformed body", { ...DRAFT, template: "OTHER" }, 400, "invalid_request"],
    ["text with only spaces", { ...DRAFT, text: " \n " }, 400, "invalid_request"],
    ["the owner", { ...DRAFT, personId: PERSON_IDS.alex }, 404, "no_person"],
  ])("refuses %s, storing nothing", async (_name, body, status, code) => {
    const response = await postSave(body);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("says why empty text is refused", async () => {
    const response = await postSave({ ...DRAFT, text: "" });
    expect((await response.json()).error.message).toBe("text: Message can’t be empty");
  });

  it("accepts a long message: there is no length limit", async () => {
    const response = await postSave({ ...DRAFT, template: "NUDGE", text: "x".repeat(5000) });
    expect(response.status).toBe(200);
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await postSave(DRAFT)).status).toBe(401);
  });
});

describe("DELETE /api/templates/:kind", () => {
  it("removes a custom template, parsing with the shared schema", async () => {
    useHousehold(NOV, { templates: WITH_JORDAN });
    const response = await remove("MONTHLY", `?personId=${PERSON_IDS.jordan}`);
    expect(response.status).toBe(200);
    expect(templateSaveResponseSchema.parse(await response.json())).toEqual({ saved: true });
    expect(stored().overrides).toEqual([]);
  });

  it("clears the Section labels of a monthly one's message", async () => {
    useHousehold(NOV, {
      templates: {
        ...DEFAULT_MESSAGE_TEMPLATES,
        overrides: [{ personId: PERSON_IDS.priya, kind: "MONTHLY", text: "Priya's" }],
        sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.priya]: "Master Bedroom Share", [PERSON_IDS.sam]: "Room 2 Share" } },
      },
    });
    expect((await remove("MONTHLY", `?personId=${PERSON_IDS.priya}`)).status).toBe(200);
    expect(stored()).toMatchObject({ overrides: [], sectionTitles: {} });
  });

  it("answers saved without storing when there is none", async () => {
    useHousehold(NOV, { templates: WITH_JORDAN });
    expect((await remove("NUDGE", `?personId=${PERSON_IDS.jordan}`)).status).toBe(200);
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["no person", "MONTHLY", "", 400, "invalid_request"],
    ["another kind", "OTHER", `?personId=${PERSON_IDS.jordan}`, 400, "invalid_request"],
    ["the owner", "MONTHLY", `?personId=${PERSON_IDS.alex}`, 404, "no_person"],
  ])("refuses %s", async (_name, kind, query, status, code) => {
    const response = await remove(kind, query);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await remove("MONTHLY", `?personId=${PERSON_IDS.jordan}`)).status).toBe(401);
  });
});

describe("POST /api/templates/:kind/restore", () => {
  it("saves the built-in text as the Default, keeping custom templates", async () => {
    useHousehold(NOV, { templates: { ...WITH_JORDAN, nudge: "Edited" } });
    const response = await restore("NUDGE");
    expect(templateSaveResponseSchema.parse(await response.json())).toEqual({ saved: true });
    expect(stored()).toEqual(WITH_JORDAN);
  });

  it("refuses another kind", async () => {
    const response = await restore("OTHER");
    expect(response.status).toBe(400);
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await restore("MONTHLY")).status).toBe(401);
  });
});

describe("POST /api/templates/labels", () => {
  it("stores the labels and section titles together, parsing with the shared schema", async () => {
    const response = await postLabels({
      lineLabels: { RENT: "Rent", UTILITIES: " PUB " },
      sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.sam]: "Room 2 Share" } },
    });
    expect(templateSaveResponseSchema.parse(await response.json())).toEqual({ saved: true });
    expect(stored()).toMatchObject({
      lineLabels: { UTILITIES: "PUB" },
      sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.sam]: "Room 2 Share" } },
    });
  });

  it.each([
    ["a blank label", { lineLabels: { RENT: " " } }, 400, "invalid_request"],
    ["a section title in the owner's message", { lineLabels: {}, sectionTitles: { [PERSON_IDS.alex]: { [PERSON_IDS.sam]: "Room 2" } } }, 404, "no_person"],
    ["a section title for the owner's lines", { lineLabels: {}, sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.alex]: "Mine" } } }, 404, "no_person"],
  ])("refuses %s, storing nothing", async (_name, body, status, code) => {
    const response = await postLabels(body);
    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("says why a blank label is refused", async () => {
    const response = await postLabels({ lineLabels: { RENT: "" } });
    expect((await response.json()).error.message).toBe("lineLabels.RENT: Enter a label.");
  });

  it("answers 401 without a session", async () => {
    unauthorized();
    expect((await postLabels({ lineLabels: {} })).status).toBe(401);
  });
});
