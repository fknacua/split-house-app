import type { MessageTemplates } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/messages/default-templates";
import { buildTemplateLanding, type TemplateLandingInput } from "./build-template-landing";
import { templatePeople } from "./template-people";

const { alex, priya, sam, jordan } = PERSON_IDS;
const PEOPLE = [
  { id: alex, name: "Alex", color: "TEAL" as const },
  { id: priya, name: "Priya", color: "PINK" as const },
  { id: sam, name: "Sam", color: "GREEN" as const },
  { id: jordan, name: "Jordan", color: "BLUE" as const },
];

const withTemplates = (templates: Partial<MessageTemplates>): MessageTemplates => ({ ...DEFAULT_MESSAGE_TEMPLATES, ...templates });

const landing = (input: Partial<TemplateLandingInput>) =>
  buildTemplateLanding({
    kind: "MONTHLY",
    month: "2026-11",
    templates: DEFAULT_MESSAGE_TEMPLATES,
    templatePeople: templatePeople([NOV_2026_CONFIG], PEOPLE),
    people: PEOPLE,
    ...input,
  });

const WITH_JORDAN = withTemplates({
  overrides: [{ personId: jordan, kind: "MONTHLY", text: "Hi {name}! Yours.\n\n{lines}" }],
});

describe("buildTemplateLanding", () => {
  it("builds the monthly breakdown with no custom templates", () => {
    const body = landing({});
    expect(body).toMatchObject({
      kind: "MONTHLY",
      title: "Monthly breakdown",
      sub: "Message template",
      default: { title: "Default", sub: "What everyone else gets" },
      custom: { title: "Custom templates", canAdd: true, cards: [] },
      forWho: {
        title: "For who",
        rows: [
          { personId: priya, label: "Priya · Primary Tenant" },
          { personId: sam, label: "Sam · Tenant" },
          { personId: jordan, label: "Jordan · Tenant" },
        ],
      },
    });
    expect(body.default.preview?.intro).toBe("Hi Priya! Eto na yung breakdown for Nov 2026 😊");
    expect(body.default.preview?.sections.map((s) => s.title)).toEqual(["Yours:", "Sam’s (please collect):"]);
  });

  it("shows a custom template rendered on its person, and leaves them out of For who", () => {
    const body = landing({ templates: WITH_JORDAN });
    expect(body.custom.cards).toEqual([
      {
        personId: jordan,
        name: "Jordan",
        initial: "J",
        color: "BLUE",
        sub: "Tenant · Room 3",
        preview: expect.objectContaining({ intro: "Hi Jordan! Yours." }),
      },
    ]);
    expect(body.forWho.rows.map((r) => r.personId)).toEqual([priya, sam]);
    expect(body.default.preview?.intro).toBe("Hi Priya! Eto na yung breakdown for Nov 2026 😊");
  });

  it("disables Add more once everyone has one", () => {
    const overrides = [priya, sam, jordan].map((personId) => ({ personId, kind: "MONTHLY" as const, text: "Hi {name}" }));
    const body = landing({ templates: withTemplates({ overrides }) });
    expect(body.custom.canAdd).toBe(false);
    expect(body.custom.cards.map((c) => c.personId)).toEqual([priya, sam, jordan]);
    expect(body.forWho.rows).toEqual([]);
  });

  it("keeps each template's custom templates apart", () => {
    const body = landing({ kind: "NUDGE", templates: WITH_JORDAN });
    expect(body.title).toBe("Nudge");
    expect(body.custom.cards).toEqual([]);
    expect(body.default.preview?.text).toBe(
      "Hi Priya! Paalala lang, yung Utilities bill for Nov 2026 ($123.69) ay due nung 7 Nov. Salamat! 🙏",
    );
  });

  it("hides a custom template for someone no longer in the household", () => {
    const gone = withTemplates({ overrides: [{ personId: "person-gone", kind: "MONTHLY", text: "Hi" }] });
    expect(landing({ templates: gone }).custom.cards).toEqual([]);
  });

  it("has no Default preview with nobody but the owner", () => {
    const body = landing({ templatePeople: [] });
    expect(body.default.preview).toBeNull();
    expect(body.custom.canAdd).toBe(false);
  });
});
