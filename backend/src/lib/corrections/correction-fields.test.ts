import { describe, expect, it } from "vitest";

import type { ChargeCategory } from "@/generated/prisma/enums";
import { PERSON_IDS } from "@/lib/fixtures/household";

import { correctionFields, correctionRefusal, type CorrectionOriginal } from "./correction-fields";

const OWNER = PERSON_IDS.alex;

const charge = (overrides: Partial<CorrectionOriginal> = {}): CorrectionOriginal => ({
  id: "charge-sep-utilities-jordan",
  month: "2026-09",
  personId: PERSON_IDS.jordan,
  category: "UTILITIES",
  paidCents: 8020,
  ...overrides,
});

describe("correctionRefusal", () => {
  it.each<[ChargeCategory]>([["UTILITIES"], ["AIRCON"], ["ONE_OFF"]])("allows a paid %s charge", (category) => {
    expect(correctionRefusal(charge({ category }), OWNER)).toBeNull();
  });

  it.each<[string, Partial<CorrectionOriginal>, string]>([
    ["a correction", { category: "CORRECTION" }, "is_correction"],
    ["the owner's charge", { personId: OWNER }, "owner_charge"],
    ["rent", { category: "RENT" }, "not_correctable"],
    ["a recurring charge", { category: "RECURRING" }, "not_correctable"],
    ["an unpaid charge", { paidCents: null }, "unpaid"],
  ])("refuses %s", (_, overrides, refusal) => {
    expect(correctionRefusal(charge(overrides), OWNER)).toBe(refusal);
  });

  it("names a correction before anything else about it", () => {
    expect(correctionRefusal(charge({ category: "CORRECTION", personId: OWNER, paidCents: null }), OWNER)).toBe(
      "is_correction",
    );
  });

  it("names the owner's charge before its category or payment", () => {
    expect(correctionRefusal(charge({ category: "RENT", personId: OWNER, paidCents: null }), OWNER)).toBe("owner_charge");
  });

  it("names rent before its payment", () => {
    expect(correctionRefusal(charge({ category: "RENT", paidCents: null }), OWNER)).toBe("not_correctable");
  });
});

describe("correctionFields", () => {
  it("copies the link, month and category from the charge it fixes", () => {
    expect(correctionFields(charge({ category: "AIRCON", month: "2026-10" }), OWNER)).toEqual({
      correctsChargeId: "charge-sep-utilities-jordan",
      correctsMonth: "2026-10",
      correctsCategory: "AIRCON",
    });
  });

  it.each<[string, Partial<CorrectionOriginal>]>([
    ["a correction", { category: "CORRECTION" }],
    ["the owner's charge", { personId: OWNER }],
    ["rent", { category: "RENT" }],
    ["an unpaid charge", { paidCents: null }],
  ])("throws for %s", (_, overrides) => {
    expect(() => correctionFields(charge(overrides), OWNER)).toThrow(/can't be corrected/);
  });
});
