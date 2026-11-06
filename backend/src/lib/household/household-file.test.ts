import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS, ROOM_IDS } from "@/lib/fixtures/household";
import { HouseholdFileError, parseHouseholdFile } from "./household-file";

const NAMES: Record<string, string> = {
  [PERSON_IDS.alex]: "Alex",
  [PERSON_IDS.priya]: "Priya",
  [PERSON_IDS.sam]: "Sam",
  [PERSON_IDS.jordan]: "Jordan",
};

function validFile() {
  return {
    _readme: ["notes are ignored"],
    startsFromMonth: "2026-11",
    ...structuredClone(NOV_2026_CONFIG),
    people: NOV_2026_CONFIG.people.map((p) => ({
      ...structuredClone(p),
      name: NAMES[p.personId],
      whatsappE164: p.role === "OWNER" ? null : "+6581234567",
    })),
  };
}

function problemsOf(json: unknown): string[] {
  try {
    parseHouseholdFile(json);
  } catch (err) {
    if (err instanceof HouseholdFileError) return err.problems;
    throw err;
  }
  throw new Error("expected the file to be rejected");
}

describe("parseHouseholdFile", () => {
  it("reads the optional message wording apart from the config", () => {
    expect(parseHouseholdFile(validFile()).templates).toBeNull();
    const parsed = parseHouseholdFile({
      ...validFile(),
      templates: { monthly: "m", nudge: "n", sectionTitles: { [PERSON_IDS.priya]: "Master Bedroom Share" } },
    });
    expect(parsed.templates).toEqual({
      monthly: "m",
      nudge: "n",
      overrides: [],
      lineLabels: {},
      sectionTitles: { [PERSON_IDS.priya]: { [PERSON_IDS.priya]: "Master Bedroom Share" } },
    });
    expect(parsed.config).not.toHaveProperty("templates");
  });

  it("reads older flat section titles in every message that holds the section", () => {
    const parsed = parseHouseholdFile({
      ...validFile(),
      templates: { monthly: "m", nudge: "n", sectionTitles: { [PERSON_IDS.sam]: "Room 2 Share" } },
    });
    // Sam's utilities and aircon go via Priya, so Sam's section is in both messages.
    expect(parsed.templates?.sectionTitles).toEqual({
      [PERSON_IDS.sam]: { [PERSON_IDS.sam]: "Room 2 Share" },
      [PERSON_IDS.priya]: { [PERSON_IDS.sam]: "Room 2 Share" },
    });
  });

  it("refuses wording for an unknown person or with a blank title", () => {
    const problems = problemsOf({
      ...validFile(),
      templates: {
        monthly: "m",
        nudge: "n",
        overrides: [{ personId: "person-nobody", kind: "NUDGE", text: "Hi" }],
        sectionTitles: { "person-nobody": "Room 9", [PERSON_IDS.priya]: { "person-ghost": "Room 8" } },
      },
    });
    expect(problems).toEqual([
      "templates.overrides.0.personId: Unknown person",
      "templates.sectionTitles.person-nobody: Unknown person",
      "templates.sectionTitles.person-nobody.person-nobody: Unknown person",
      `templates.sectionTitles.${PERSON_IDS.priya}.person-ghost: Unknown person`,
    ]);
    expect(problemsOf({ ...validFile(), templates: { monthly: "", nudge: "n" } })[0]).toMatch(/^templates\.monthly:/);
  });

  it("splits a valid file into Person rows and the config", () => {
    const result = parseHouseholdFile(validFile());

    expect(result.startsFromMonth).toBe("2026-11");
    expect(result.config).toEqual(NOV_2026_CONFIG);
    expect(result.people).toEqual([
      { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, color: "TEAL", isOwner: true },
      { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6581234567", color: "BLUE", isOwner: false },
      { id: PERSON_IDS.sam, name: "Sam", whatsappE164: "+6581234567", color: "ORANGE", isOwner: false },
      { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6581234567", color: "GREEN", isOwner: false },
    ]);
  });

  it("lists every blank field by path, without values", () => {
    const file = validFile();
    file.startsFromMonth = "Nov";
    file.people[1].name = " ";
    file.people[2].whatsappE164 = "+65";
    file.people[3].dueDays = { RENT: 0 };

    expect(problemsOf(file)).toEqual(
      expect.arrayContaining([
        "startsFromMonth: use YYYY-MM",
        "people.1.name: required",
        "people.2.whatsappE164: required, +65 and the number",
        expect.stringMatching(/^people\.3\.dueDays\.RENT: /),
      ]),
    );
  });

  it("requires rent above zero on an occupied tenant room, and not on an empty one", () => {
    const zeroRent = (file: ReturnType<typeof validFile>) => ({
      ...file,
      rooms: file.rooms.map((r) => (r.id === ROOM_IDS.room3 ? { ...r, rentCents: 0 } : r)),
    });
    expect(problemsOf(zeroRent(validFile()))).toEqual(["rooms.2.rentCents: must be above 0 for an occupied room"]);

    const emptyRoom = validFile();
    emptyRoom.people = emptyRoom.people.filter((p) => p.personId !== PERSON_IDS.jordan);
    expect(parseHouseholdFile(zeroRent(emptyRoom)).config.people).toHaveLength(3);
  });

  it("refuses a file with no rooms, as a version 1 file has", () => {
    const oldShape: Record<string, unknown> = validFile();
    delete oldShape.rooms;
    expect(problemsOf(oldShape)).toEqual(expect.arrayContaining([expect.stringMatching(/^rooms: /)]));
  });

  it("applies the shared schema's household rules", () => {
    const file = validFile();
    file.categories.utilities.primaryBps = 4000;

    expect(problemsOf(file)).toEqual(["categories.utilities: Owner and primary percentages must add to 100%"]);
  });

  it("rejects a file that is not an object", () => {
    expect(problemsOf([])).toEqual(["(root): must be an object"]);
  });
});
