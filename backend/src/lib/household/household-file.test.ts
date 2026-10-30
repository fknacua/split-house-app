import { describe, expect, it } from "vitest";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
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
  it("splits a valid file into Person rows and the config", () => {
    const result = parseHouseholdFile(validFile());

    expect(result.startsFromMonth).toBe("2026-11");
    expect(result.config).toEqual(NOV_2026_CONFIG);
    expect(result.people).toEqual([
      { id: PERSON_IDS.alex, name: "Alex", whatsappE164: null, isOwner: true },
      { id: PERSON_IDS.priya, name: "Priya", whatsappE164: "+6581234567", isOwner: false },
      { id: PERSON_IDS.sam, name: "Sam", whatsappE164: "+6581234567", isOwner: false },
      { id: PERSON_IDS.jordan, name: "Jordan", whatsappE164: "+6581234567", isOwner: false },
    ]);
  });

  it("lists every blank field by path, without values", () => {
    const file = validFile();
    file.startsFromMonth = "Nov";
    file.people[1].name = " ";
    file.people[2].whatsappE164 = "+65";
    file.people[3].rentCents = 0;
    file.people[3].dueDays = { RENT: 0 };

    expect(problemsOf(file)).toEqual(
      expect.arrayContaining([
        "startsFromMonth: use YYYY-MM",
        "people.1.name: required",
        "people.2.whatsappE164: required, +65 and the number",
        "people.3.rentCents: must be above 0 for a tenant",
        expect.stringMatching(/^people\.3\.dueDays\.RENT: /),
      ]),
    );
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
