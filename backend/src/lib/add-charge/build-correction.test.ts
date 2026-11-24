import { addChargePreviewSchema, type AddCorrectionValues } from "@splithouse/shared";
import { describe, expect, it } from "vitest";
import { CORRECTABLE_CHARGES } from "@/lib/fixtures/correctable-charges";
import { NOV_2026_CONFIG, PERSON_IDS } from "@/lib/fixtures/household";
import {
  addCorrectionProblem,
  buildCorrectionCharge,
  buildCorrectionPreview,
  correctionChargeProblem,
  correctionPeople,
  currentCents,
  findCorrectable,
  openingCorrectionValues,
  type CorrectableCharge,
  type CorrectionInput,
} from "./build-correction";

const { alex, priya, sam, jordan } = PERSON_IDS;

const INPUT: CorrectionInput = {
  month: "2026-11",
  config: NOV_2026_CONFIG,
  people: [
    { id: alex, name: "Alex", color: "BLUE" },
    { id: priya, name: "Priya", color: "ORANGE" },
    { id: sam, name: "Sam", color: "GREEN" },
    { id: jordan, name: "Jordan", color: "PURPLE" },
  ],
  today: "2026-11-24",
  charges: CORRECTABLE_CHARGES,
};

const charge = (id: string): CorrectableCharge => {
  const found = CORRECTABLE_CHARGES.find((c) => c.id === id);
  if (!found) throw new Error(`No fixture charge ${id}`);
  return found;
};

const OPENING: AddCorrectionValues = openingCorrectionValues("2026-11-24", null);
const picked = (chargeId: string, amountCents: number | null, dueDate: string | null = "2026-11-24"): AddCorrectionValues => ({
  personId: charge(chargeId).personId,
  month: charge(chargeId).month,
  chargeId,
  amountCents,
  dueDate,
});
const preview = (values: AddCorrectionValues) => addChargePreviewSchema.parse(buildCorrectionPreview(INPUT, values));

describe("currentCents", () => {
  it("adds every linked correction to the original", () => {
    expect(currentCents(charge("sep-utilities-sam"))).toBe(8246);
    expect(currentCents(charge("oct-utilities-jordan"))).toBe(7746);
  });
});

describe("correctionPeople", () => {
  it("lists household people with a paid utilities, aircon or one-off charge, months newest first, utilities first", () => {
    expect(correctionPeople(INPUT)).toEqual([
      {
        personId: sam,
        name: "Sam",
        months: [
          { month: "2026-10", label: "Oct 2026", charges: [{ chargeId: "oct-aircon-sam", label: "Aircon servicing · $18.33" }] },
          { month: "2026-09", label: "Sep 2026", charges: [{ chargeId: "sep-utilities-sam", label: "Utilities · $82.46" }] },
        ],
      },
      {
        personId: jordan,
        name: "Jordan",
        months: [
          {
            month: "2026-10",
            label: "Oct 2026",
            // The current amount, after the earlier correction.
            charges: [
              { chargeId: "oct-utilities-jordan", label: "Utilities · $77.46" },
              { chargeId: "oct-fridge-jordan", label: "Fridge repair · $30.00" },
            ],
          },
        ],
      },
    ]);
  });

  it("leaves out rent, corrections, the owner's, unpaid charges and people no longer in the household", () => {
    const ids = correctionPeople(INPUT).flatMap((p) => p.months.flatMap((m) => m.charges.map((c) => c.chargeId)));
    expect(ids.sort()).toEqual(["oct-aircon-sam", "oct-fridge-jordan", "oct-utilities-jordan", "sep-utilities-sam"]);
  });
});

describe("openingCorrectionValues", () => {
  it("opens with nothing picked and the Due date today", () => {
    expect(OPENING).toEqual({ personId: null, month: null, chargeId: null, amountCents: null, dueDate: "2026-11-24" });
  });

  it("opened from a charge, picks it, its person and its month", () => {
    expect(openingCorrectionValues("2026-11-24", charge("oct-fridge-jordan"))).toEqual({
      personId: jordan,
      month: "2026-10",
      chargeId: "oct-fridge-jordan",
      amountCents: null,
      dueDate: "2026-11-24",
    });
  });
});

describe("findCorrectable", () => {
  it("finds an offered charge and nothing else", () => {
    expect(findCorrectable(INPUT, "oct-fridge-jordan")?.id).toBe("oct-fridge-jordan");
    expect(findCorrectable(INPUT, "oct-rent-jordan")).toBeNull();
    expect(findCorrectable(INPUT, "sep-utilities-former")).toBeNull();
    expect(findCorrectable(INPUT, null)).toBeNull();
  });
});

describe("buildCorrectionPreview", () => {
  it("before a charge is picked: the amount and Due date are disabled and Save is off", () => {
    expect(preview(OPENING)).toEqual({
      show: { label: false, scope: false, who: false, split: false },
      preview: null,
      custom: null,
      shares: null,
      correction: { current: null, outcome: null, amountEnabled: false, dueDateEnabled: false },
      save: { label: "Save", enabled: false },
      confirm: null,
    });
  });

  it("once a charge is picked: the current amount shows and the amount can be typed", () => {
    expect(preview(picked("sep-utilities-sam", null)).correction).toEqual({
      current: "Currently $82.46",
      outcome: null,
      amountEnabled: true,
      dueDateEnabled: false,
    });
  });

  it("says how many corrections the current amount is after", () => {
    expect(preview(picked("oct-utilities-jordan", null)).correction?.current).toBe("Currently $77.46 · after 1 correction");
    const twice: CorrectionInput = {
      ...INPUT,
      charges: [{ ...charge("oct-utilities-jordan"), correctionCents: [-500, 200] }],
    };
    expect(buildCorrectionPreview(twice, picked("oct-utilities-jordan", null)).correction?.current).toBe(
      "Currently $79.46 · after 2 corrections",
    );
  });

  it("a lower amount on a routed charge: a refund to whoever paid it, Due date off, Save on", () => {
    const result = preview(picked("sep-utilities-sam", 7746));
    expect(result.correction).toEqual({
      current: "Currently $82.46",
      outcome: "Refund $5.00 to Priya (for Sam) yourself. This is saved as history.",
      amountEnabled: true,
      dueDateEnabled: false,
    });
    expect(result.save).toEqual({ label: "Save", enabled: true });
    expect(result.confirm).toEqual({
      title: "Add this correction?",
      body: "It will be linked to the original charge.",
      rows: [
        { label: "For", value: "Utilities · Sam · Sep 2026", items: null },
        { label: "Correct amount", value: "$77.46", items: null },
        { label: "Outcome", value: "Refund $5.00 to Priya (for Sam) yourself. Saved as history.", items: null },
      ],
      confirmLabel: "Add correction",
      cancelLabel: "Go back",
    });
  });

  it("a lower amount compares with the amount after earlier corrections", () => {
    expect(preview(picked("oct-utilities-jordan", 7000)).correction?.outcome).toBe(
      "Refund $7.46 to Jordan yourself. This is saved as history.",
    );
  });

  it("$0 is a full refund", () => {
    const result = preview(picked("oct-fridge-jordan", 0));
    expect(result.correction?.outcome).toBe("Refund $30.00 to Jordan yourself. This is saved as history.");
    expect(result.save.enabled).toBe(true);
  });

  it("a higher amount: an extra charge, Due date on, and a Due date row in the confirm", () => {
    const result = preview(picked("oct-fridge-jordan", 3500, "2026-11-30"));
    expect(result.correction).toMatchObject({ outcome: "Adds a $5.00 charge for Jordan", dueDateEnabled: true });
    expect(result.confirm?.rows).toEqual([
      { label: "For", value: "Fridge repair · Jordan · Oct 2026", items: null },
      { label: "Correct amount", value: "$35.00", items: null },
      { label: "Outcome", value: "Adds a $5.00 charge for Jordan", items: null },
      { label: "Due date", value: "30 Nov 2026", items: null },
    ]);
  });

  it("a higher amount for someone who pays via another person names the payer", () => {
    expect(preview(picked("oct-aircon-sam", 2333)).correction?.outcome).toBe("Adds a $5.00 charge for Sam · via Priya");
  });

  it("a higher amount with no due date keeps Save off", () => {
    const result = preview(picked("oct-fridge-jordan", 3500, null));
    expect(result.correction?.outcome).toBe("Adds a $5.00 charge for Jordan");
    expect(result.save.enabled).toBe(false);
    expect(result.confirm).toBeNull();
  });

  it.each([
    ["unchanged", 3000],
    ["below $0", -100],
  ])("an amount %s: no outcome, Due date off, Save off", (_name, amountCents) => {
    const result = preview(picked("oct-fridge-jordan", amountCents));
    expect(result.correction).toMatchObject({ outcome: null, dueDateEnabled: false });
    expect(result.save.enabled).toBe(false);
  });

  it("a charge that isn't offered counts as none picked", () => {
    expect(preview(picked("oct-rent-jordan", 90000)).correction).toEqual({
      current: null,
      outcome: null,
      amountEnabled: false,
      dueDateEnabled: false,
    });
  });
});

describe("correctionChargeProblem", () => {
  it.each([
    ["no such charge", null, 404, "no_charge"],
    ["a correction", "oct-correction-jordan", 409, "is_correction"],
    ["the owner's charge", "oct-utilities-alex", 409, "owner_charge"],
    ["rent", "oct-rent-jordan", 409, "not_correctable"],
    ["an unpaid charge", "nov-utilities-jordan", 409, "unpaid"],
    ["someone no longer in the household", "sep-utilities-former", 404, "no_person"],
  ])("refuses %s", (_name, id, status, code) => {
    expect(correctionChargeProblem(INPUT, id === null ? null : charge(id))).toMatchObject({ status, code });
  });

  it("accepts a charge that can be corrected", () => {
    expect(correctionChargeProblem(INPUT, charge("oct-aircon-sam"))).toBeNull();
  });
});

describe("addCorrectionProblem", () => {
  it.each<[string, AddCorrectionValues, CorrectableCharge | null, number, string]>([
    ["no charge picked", OPENING, null, 422, "no_pick"],
    ["an unknown charge", { ...OPENING, chargeId: "nope" }, null, 404, "no_charge"],
    ["rent", picked("oct-rent-jordan", 90000), charge("oct-rent-jordan"), 409, "not_correctable"],
    ["no amount", picked("oct-fridge-jordan", null), charge("oct-fridge-jordan"), 422, "no_amount"],
    ["a negative amount", picked("oct-fridge-jordan", -1), charge("oct-fridge-jordan"), 422, "negative_amount"],
    ["an unchanged amount", picked("oct-utilities-jordan", 7746), charge("oct-utilities-jordan"), 422, "unchanged"],
    ["a higher amount with no due date", picked("oct-fridge-jordan", 3500, null), charge("oct-fridge-jordan"), 422, "no_date"],
  ])("refuses %s", (_name, values, found, status, code) => {
    expect(addCorrectionProblem(INPUT, values, found)).toMatchObject({ status, code });
  });

  it("accepts a refund with no due date, which it doesn't read", () => {
    expect(addCorrectionProblem(INPUT, picked("oct-fridge-jordan", 0, null), charge("oct-fridge-jordan"))).toBeNull();
  });
});

describe("buildCorrectionCharge", () => {
  it("a refund is paid today by whoever paid the original, through the original's route", () => {
    expect(buildCorrectionCharge(INPUT, picked("sep-utilities-sam", 7746, "2026-12-01"), charge("sep-utilities-sam"))).toEqual({
      correctsChargeId: "sep-utilities-sam",
      correctsMonth: "2026-09",
      correctsCategory: "UTILITIES",
      personId: sam,
      payViaPersonId: priya,
      label: "Utilities correction (Sep)",
      amountCents: -500,
      dueDate: "2026-11-24",
      paidCents: -500,
      paidOn: "2026-11-24",
      paidByPersonId: priya,
    });
  });

  it("an extra charge is unpaid, due on the picked date, through the household's route now", () => {
    expect(buildCorrectionCharge(INPUT, picked("oct-aircon-sam", 2333, "2026-11-30"), charge("oct-aircon-sam"))).toEqual({
      correctsChargeId: "oct-aircon-sam",
      correctsMonth: "2026-10",
      correctsCategory: "AIRCON",
      personId: sam,
      payViaPersonId: priya,
      label: "Aircon servicing correction (Oct)",
      amountCents: 500,
      dueDate: "2026-11-30",
      paidCents: null,
      paidOn: null,
      paidByPersonId: null,
    });
  });

  it("a one-off takes the utilities route, and the difference is from the amount after earlier corrections", () => {
    const result = buildCorrectionCharge(INPUT, picked("oct-utilities-jordan", 8000), charge("oct-utilities-jordan"));
    expect(result).toMatchObject({ amountCents: 254, payViaPersonId: null, label: "Utilities correction (Oct)" });
  });

  it("throws for fields that don't pass the checks", () => {
    expect(() => buildCorrectionCharge(INPUT, picked("oct-fridge-jordan", 3000), charge("oct-fridge-jordan"))).toThrow();
  });
});
